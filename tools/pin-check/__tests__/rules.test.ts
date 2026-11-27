import { describe, expect, it } from 'vitest';
import { checkImages, checkPackageJson, checkTofu, checkWorkflow } from '../src/rules.ts';

const D = `sha256:${'a'.repeat(64)}`;
describe('pin-check (REQ-FND-004)', () => {
  it('package.json: exata passa; faixa falha', () => {
    expect(checkPackageJson('p', JSON.stringify({ dependencies: { a: '1.2.3', b: 'workspace:*' } }))).toEqual([]);
    for (const v of ['^1.2.3', '~1.2.3', '*', 'latest', '>=1.0.0', '1.x', '1.2']) {
      expect(checkPackageJson('p', JSON.stringify({ dependencies: { a: v } })), v).toHaveLength(1);
    }
  });
  it('imagens: digest passa; tag e latest falham; estágio do multi-stage e ${IMAGE_*} passam', () => {
    expect(checkImages('Dockerfile', `FROM node@${D} AS build\nFROM build`)).toEqual([]);
    expect(checkImages('c.yml', '    image: ${IMAGE_GATEWAY:?}')).toEqual([]);
    expect(checkImages('Dockerfile', 'FROM node:24')).toHaveLength(1);
    expect(checkImages('c.yml', '    image: redis:latest')).toHaveLength(1);
  });
  it('actions: SHA passa; tag falha', () => {
    expect(checkWorkflow('w', `      - uses: actions/checkout@${'a'.repeat(40)} # v7`)).toEqual([]);
    expect(checkWorkflow('w', '      - uses: actions/checkout@v4')).toHaveLength(1);
  });
  it('OpenTofu: versão exata', () => {
    expect(checkTofu('m.tf', 'oci = { source = "oracle/oci", version = "9.15.0" }')).toEqual([]);
    expect(checkTofu('m.tf', 'oci = { source = "oracle/oci", version = "~> 9.0" }')).toHaveLength(1);
  });
});
