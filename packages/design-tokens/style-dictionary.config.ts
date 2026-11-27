import StyleDictionary from 'style-dictionary';

/**
 * Tokens únicos (REQ-FND-060): DTCG em src/*.json → dist/tokens.css (CSS vars, web) e dist/tokens.ts
 * (objeto tipado, web e React Native). Rode `pnpm --filter @koovela/design-tokens build`.
 */
const SRC = process.env.TOKENS_SRC ?? 'src';
const OUT = `${process.env.TOKENS_OUT ?? 'dist'}/`;
const sd = new StyleDictionary({
  source: [`${SRC}/color.json`, `${SRC}/state.json`, `${SRC}/typography.json`],
  usesDtcg: true,
  log: { verbosity: 'silent', warnings: 'disabled' },
  platforms: {
    css: {
      transforms: [
        'attribute/cti', 'name/koovela-kebab', 'time/seconds', 'html/icon', 'color/css', 'asset/url', 'fontFamily/css',
        'cubicBezier/css', 'strokeStyle/css/shorthand', 'border/css/shorthand', 'typography/css/shorthand',
        'transition/css/shorthand', 'shadow/css/shorthand',
      ],
      buildPath: OUT,
      files: [{ destination: 'tokens.css', format: 'css/variables', options: { outputReferences: true, selector: ':root' } }],
    },
    ts: {
      transforms: ['name/camel'],
      buildPath: OUT,
      files: [{ destination: 'tokens.ts', format: 'koovela/ts-tree' }],
    },
  },
});

// `DEFAULT` marca o valor-base de um grupo: color.brand.terracota.DEFAULT → --color-brand-terracota.
sd.registerTransform({
  name: 'name/koovela-kebab',
  type: 'name',
  transform: (t) => t.path.filter((p) => p !== 'DEFAULT').join('-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
});

sd.registerFormat({
  name: 'koovela/ts-tree',
  format: ({ dictionary }) => {
    const tree: Record<string, unknown> = {};
    for (const t of dictionary.allTokens) {
      let node = tree;
      const path = t.path;
      path.forEach((seg, i) => {
        if (i === path.length - 1) {
          const existing = node[seg];
          node[seg] = existing && typeof existing === 'object' ? { ...existing, DEFAULT: t.$value } : t.$value;
          void existing;
        } else {
          const cur = node[seg];
          node[seg] = cur && typeof cur === 'object' ? cur : cur === undefined ? {} : { DEFAULT: cur };
          node = node[seg] as Record<string, unknown>;
        }
      });
    }
    return `// Gerado pelo Style Dictionary — não edite. Fonte: packages/design-tokens/src/*.json\nexport const tokens = ${JSON.stringify(tree, null, 2)} as const;\nexport type Tokens = typeof tokens;\n`;
  },
});

await sd.buildAllPlatforms();
