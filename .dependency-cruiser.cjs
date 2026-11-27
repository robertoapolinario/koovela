/** Fronteiras de domínio (REQ-FND-005, G-VII): um domínio não importa o código de outro. */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-domain',
      severity: 'error',
      comment:
        'Um domínio em services/* não importa outro; use contrato (packages/contracts) ou evento. ' +
        'Exceção: testes de integração ponta a ponta (*.integration.test.ts), que compõem processos.',
      from: { path: '^services/([^/]+)/', pathNot: '\\.(integration|int)\\.test\\.ts$' },
      to: { path: '^services/([^/]+)/', pathNot: '^services/$1/' },
    },
    {
      name: 'packages-not-depend-on-services',
      severity: 'error',
      comment: 'Pacotes compartilhados não dependem de domínios.',
      from: { path: '^packages/' },
      to: { path: '^(services|runtimes)/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(node_modules|dist|coverage|__tests__/fixtures)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    combinedDependencies: true,
  },
};
