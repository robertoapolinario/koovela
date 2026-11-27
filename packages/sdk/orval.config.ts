import { defineConfig } from 'orval';

/**
 * SDK gerado dos contratos (REQ-FND-070): cliente fetch + hooks TanStack Query (web e React Native)
 * e esquemas Zod (serviços e validação). Nada de URL ou payload montado à mão nos clientes.
 */
const input = {
  target: '../contracts/openapi/gateway.openapi.yaml',
  // O Problem Details é um JSON Schema separado, referenciado pelo contrato.
  parserOptions: { externalRefs: { allow: ['../schemas/problem-details.schema.json'] } },
};

export default defineConfig({
  client: {
    input,
    output: {
      target: 'src/generated/client/gateway.ts',
      client: 'react-query',
      httpClient: 'fetch',
      mode: 'single',
      clean: true,
      override: { mutator: { path: 'src/http.ts', name: 'koovelaFetch' } },
    },
  },
  zod: {
    input,
    output: { target: 'src/generated/zod/gateway.ts', client: 'zod', mode: 'single', clean: true },
  },
});
