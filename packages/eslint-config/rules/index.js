import noNumberMoney from './no-number-money.js';
import noRawDesignValues from './no-raw-design-values.js';
import noRawFetch from './no-raw-fetch.js';

export const rules = {
  'no-number-money': noNumberMoney,
  'no-raw-design-values': noRawDesignValues,
  'no-raw-fetch': noRawFetch,
};
export default { meta: { name: '@koovela/eslint-plugin' }, rules };
