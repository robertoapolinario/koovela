import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';
import noNumberMoney from '../no-number-money.js';
import noRawDesignValues from '../no-raw-design-values.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

tester.run('no-number-money', noNumberMoney, {
  valid: [
    'type Price = { amount: Money };',
    'interface Item { amount_cents: bigint }',
    'let count: number = 1;',
  ],
  invalid: [
    { code: 'type T = { amountCents: number };', errors: [{ messageId: 'useMoney' }] },
    { code: 'interface I { price: number }', errors: [{ messageId: 'useMoney' }] },
    { code: 'let total_cents: number = 0;', errors: [{ messageId: 'useMoney' }] },
  ],
});

tester.run('no-raw-design-values', noRawDesignValues, {
  valid: [
    { code: 'const c = tokens.color.brand.terracota;', filename: 'apps/web/a.tsx' },
    { code: 'const c = "#B5532F";', filename: 'packages/design-tokens/src/a.ts' },
    { code: 'const label = "Agenda";', filename: 'apps/web/a.tsx' },
  ],
  invalid: [
    { code: 'const c = "#B5532F";', filename: 'apps/web/a.tsx', errors: [{ messageId: 'useToken' }] },
    { code: 'const s = { padding: "12px" };', filename: 'apps/web/a.tsx', errors: [{ messageId: 'useToken' }] },
    { code: 'const s = `rgb(0,0,0)`;', filename: 'apps/web/a.tsx', errors: [{ messageId: 'useToken' }] },
  ],
});
