import { build } from 'esbuild';

/**
 * Empacota um processo (gateway, core, workers) num único ESM para a imagem de produção.
 * Necessário porque os pacotes do workspace exportam TypeScript e o Node não remove tipos
 * dentro de node_modules. Uso: node tools/build/bundle.ts <entrada.ts> <saida.mjs>
 */
const [entry, outfile] = process.argv.slice(2);
if (!entry || !outfile) {
  console.error('uso: bundle.ts <entrada.ts> <saida.mjs>');
  process.exit(2);
}
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: 'linked',
  minify: false,
  legalComments: 'linked',
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; import { fileURLToPath as __fu } from 'node:url'; import { dirname as __dn } from 'node:path'; const require = __cr(import.meta.url); const __filename = __fu(import.meta.url); const __dirname = __dn(__filename);",
  },
});
console.log(`✔ ${outfile}`);
