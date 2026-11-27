import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderRestoreRecord, validateRestoreRecord, type RestoreRecord } from './restore-record.ts';

/**
 * pnpm ops:restore-test --env staging --point <ISO-8601> [--out docs/ops/restore-tests]
 *
 * Roda NO host de dados do staging (o job mensal entra por SSH no túnel). Restaura do R2 (cópia externa):
 * dump diário anterior ao instante + binlogs até o instante, num MySQL descartável; confere contagens e
 * CHECKSUM TABLE contra o manifesto do dump; mede a duração (RTO 4 h) e escreve o registro (data-model §1.4).
 */
const MYSQL_IMAGE = 'mysql@sha256:0f51e63e537a1f176423fa03ef559aabe6fa4372a53160a44bc7e75da7d15364';
const CONTAINER = 'koovela-restore-test';
const WORK = '/srv/koovela/restore-test';
const RTO_MINUTES = 240;

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const env = arg('env');
const point = arg('point') ?? new Date(Date.now() - 3_600_000).toISOString();
const outDir = arg('out') ?? 'docs/ops/restore-tests';
if (env !== 'staging') {
  console.error('o teste de restauração roda sempre em staging (--env staging)');
  process.exit(2);
}

function sh(cmd: string, input?: string): string {
  const r = spawnSync('sh', ['-c', `. /usr/local/bin/lib.sh && ${cmd}`], { encoding: 'utf8', input, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`falhou: ${cmd.split(' ').slice(0, 3).join(' ')}… (${r.stderr.trim().split('\n').pop()})`);
  return r.stdout;
}

const started = Date.now();
const checks: RestoreRecord['checks'] = [];
const check = (name: string, ok: boolean, detail?: string) => checks.push({ name, result: ok ? 'ok' : 'failed', ...(detail ? { detail } : {}) });
const rootPw = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const mysql = (sql: string) => sh(`mysql -h 127.0.0.1 -P 33306 -uroot -p'${rootPw}' -N -e "${sql.replace(/"/g, '\\"')}"`).trim();

try {
  // 1. Snapshot diário mais recente antes do instante, do R2.
  const snaps = JSON.parse(sh('with_r2 restic snapshots --tag kind=daily --json')) as { short_id: string; time: string }[];
  const snap = snaps.filter((s) => Date.parse(s.time) <= Date.parse(point)).sort((a, b) => Date.parse(b.time) - Date.parse(a.time))[0];
  check('snapshot diário anterior ao instante no R2', Boolean(snap), snap?.time);
  if (!snap) throw new Error('nenhum snapshot anterior ao instante');
  mkdirSync(WORK, { recursive: true });
  sh(`rm -rf ${WORK}/* && with_r2 restic restore ${snap.short_id} --target ${WORK}/dump`);
  sh(`with_r2 restic restore latest --tag kind=binlog --target ${WORK}/binlog`);
  const dumpDir = sh(`find ${WORK}/dump -maxdepth 5 -type d -name 'dump-*' | head -1`).trim();

  // 2. MySQL descartável com a mesma imagem de produção.
  sh(`docker rm -f ${CONTAINER} >/dev/null 2>&1 || true`);
  sh(`docker run -d --name ${CONTAINER} -p 127.0.0.1:33306:3306 -e MYSQL_ROOT_PASSWORD='${rootPw}' ${MYSQL_IMAGE} --local-infile=1 --gtid-mode=ON --enforce-gtid-consistency=ON --default-time-zone=+00:00`);
  sh(`for i in $(seq 90); do mysqladmin -h 127.0.0.1 -P 33306 -uroot -p'${rootPw}' ping --silent && exit 0; sleep 2; done; exit 1`);

  // 3. Carrega o dump e confere contra o manifesto (antes do replay).
  sh(`mysqlsh --no-wizard --uri root@127.0.0.1:33306 --passwords-from-stdin --js -e "util.loadDump('${dumpDir}', {threads: 2, ignoreVersion: true, skipBinlog: true})"`, rootPw);
  const manifest = readFileSync(join(dumpDir, 'koovela-manifest.tsv'), 'utf8').trim().split('\n').filter(Boolean).map((l) => l.split('\t'));
  const schemas = new Set(manifest.map(([t]) => (t ?? '').split('.')[0]));
  const restored = new Set(mysql("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'koovela\\_%'").split('\n'));
  check('schemas presentes', [...schemas].every((s) => restored.has(s ?? '')), `${schemas.size} schemas`);
  const bad = manifest.filter(([t, count, sum]) => mysql(`SELECT COUNT(*) FROM ${t}`) !== count || mysql(`CHECKSUM TABLE ${t}`).split('\t')[1] !== sum);
  check('contagens e CHECKSUM TABLE iguais ao manifesto do dump', bad.length === 0, bad.length ? `${bad.length} tabela(s) divergentes` : `${manifest.length} tabelas`);

  // 4. Replay dos binlogs até o instante (RPO).
  const meta = JSON.parse(readFileSync(join(dumpDir, '@.json'), 'utf8')) as { gtidExecuted?: string };
  sh(`cd ${WORK}/binlog && files=$(find . -name 'binlog.[0-9]*' | sort) && mysqlbinlog --exclude-gtids='${meta.gtidExecuted ?? ''}' --stop-datetime='${point.replace('T', ' ').replace(/\..*$|Z$/, '')}' $files | mysql -h 127.0.0.1 -P 33306 -uroot -p'${rootPw}'`);
  check('replay de binlogs até o instante', true, point);
} catch (e) {
  check('execução', false, e instanceof Error ? e.message : String(e));
} finally {
  spawnSync('sh', ['-c', `docker rm -f ${CONTAINER} >/dev/null 2>&1; rm -rf ${WORK}`]);
}

const duration = Math.round((Date.now() - started) / 60_000);
check(`duração dentro do RTO (${RTO_MINUTES} min)`, duration <= RTO_MINUTES, `${duration} min`);
const record: RestoreRecord = {
  date: new Date().toISOString().slice(0, 10),
  environment: 'staging',
  restored_point: point,
  source: 'cloudflare-r2',
  duration_minutes: duration,
  executor: process.env.GITHUB_WORKFLOW ? `github:${process.env.GITHUB_WORKFLOW}` : (process.env.USER ?? 'manual'),
  checks,
  result: checks.every((c) => c.result === 'ok') ? 'success' : 'failure',
};
const text = renderRestoreRecord(record, 'Gerado por `pnpm ops:restore-test`. Revisão do SRE: _pendente_.');
const errors = validateRestoreRecord(text);
if (errors.length) throw new Error(`registro inválido: ${errors.join('; ')}`);
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${record.date.slice(0, 7)}.md`);
writeFileSync(file, text);
writeFileSync('/var/lib/koovela/metrics/restore_test.prom', `koovela_restore_test_last_timestamp_seconds ${Math.floor(Date.now() / 1000)}\nkoovela_restore_test_last_success ${record.result === 'success' ? 1 : 0}\n`);
console.log(`${record.result === 'success' ? '✔' : '✖'} ${file} (${duration} min)`);
process.exit(record.result === 'success' ? 0 : 1);
