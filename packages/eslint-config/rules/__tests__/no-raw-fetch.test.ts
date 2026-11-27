import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';
import noRawFetch from '../no-raw-fetch.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

new RuleTester({ languageOptions: { parser: tseslint.parser } }).run('no-raw-fetch', noRawFetch, {
  valid: [
    "import { useGetHealth } from '@koovela/sdk'; const q = useGetHealth();",
    "const label = 'Agendamentos';",
    "navigate('/appointments');",
  ],
  invalid: [
    { code: "fetch('/v1/health')", errors: [{ messageId: 'useSdk' }, { messageId: 'rawApiUrl' }] },
    { code: 'window.fetch(url)', errors: [{ messageId: 'useSdk' }] },
    { code: "axios.get('x')", errors: [{ messageId: 'useSdk' }] },
    { code: 'new XMLHttpRequest()', errors: [{ messageId: 'useSdk' }] },
    { code: 'const u = `https://api.koovela.com/v1/x/${id}`;', errors: [{ messageId: 'rawApiUrl' }] },
  ],
});
