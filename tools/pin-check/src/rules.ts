/**
 * REQ-FND-004: versões fixadas. Imagem só por digest (nunca `latest` nem tag solta); dependência npm com
 * versão exata (sem ^, ~, *, x, >=, intervalos); action do GitHub por SHA de commit; provider OpenTofu exato.
 */
export interface Issue {
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

const RANGE = /^(\^|~|>|<|\*|x$|latest$)|\s-\s|\|\||\.x(\.|$)|\.\*$/;

export function checkPackageJson(file: string, text: string): Issue[] {
  const j = JSON.parse(text) as Record<string, Record<string, string> | undefined>;
  const out: Issue[] = [];
  for (const sec of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, v] of Object.entries(j[sec] ?? {})) {
      if (v.startsWith('workspace:')) continue;
      if (RANGE.test(v) || !/^\d+\.\d+\.\d+([-+][\w.]+)?$/.test(v)) {
        out.push({ file, line: lineOf(text, `"${name}"`), message: `${sec}.${name}: "${v}" não é versão exata` });
      }
    }
  }
  return out;
}

/** Dockerfile e compose: `FROM`/`image:` precisam de @sha256 (variável `${IMAGE_*}` vinda do release.json é aceita). */
export function checkImages(file: string, text: string): Issue[] {
  const out: Issue[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    const m = /^(?:FROM\s+(?:--platform=\S+\s+)?|image:\s*)(\S+)/i.exec(line);
    if (!m) return;
    const ref = m[1] as string;
    if (/^\$\{IMAGE_[A-Z_]+:\?\}?$/.test(ref) || /^\$\{IMAGE_[A-Z_]+\}$/.test(ref)) return; // digest do release.json
    if (/^[a-z0-9-]+$/i.test(ref) && /^FROM/i.test(line) && !ref.includes('/') && !ref.includes(':') && !ref.includes('@')) {
      // estágio anterior do multi-stage (FROM build)
      if (text.includes(` AS ${ref}`)) return;
    }
    if (!/@sha256:[a-f0-9]{64}$/.test(ref)) out.push({ file, line: i + 1, message: `imagem sem digest: ${ref}` });
  });
  return out;
}

/** Workflows: `uses:` por SHA de 40 caracteres (ações locais ./ e docker:// por digest aceitas). */
export function checkWorkflow(file: string, text: string): Issue[] {
  const out: Issue[] = [];
  text.split('\n').forEach((raw, i) => {
    const m = /^\s*-?\s*uses:\s*(\S+)/.exec(raw);
    if (!m) return;
    const ref = m[1] as string;
    if (ref.startsWith('./')) return;
    if (ref.startsWith('docker://') ? !/@sha256:[a-f0-9]{64}$/.test(ref) : !/@[0-9a-f]{40}$/.test(ref)) {
      out.push({ file, line: i + 1, message: `action sem SHA fixo: ${ref}` });
    }
  });
  return out;
}

/** OpenTofu: `version = "x.y.z"` exato nos required_providers. */
export function checkTofu(file: string, text: string): Issue[] {
  const out: Issue[] = [];
  text.split('\n').forEach((raw, i) => {
    const m = /source\s*=\s*"[^"]+",\s*version\s*=\s*"([^"]+)"/.exec(raw);
    if (m && !/^\d+\.\d+\.\d+$/.test(m[1] as string)) out.push({ file, line: i + 1, message: `provider sem versão exata: ${m[1]}` });
  });
  return out;
}

function lineOf(text: string, needle: string): number {
  return text.split('\n').findIndex((l) => l.includes(needle)) + 1;
}
