import config from '../app.config';

/** Links universais do app do consumidor (REQ-FND-090). */
describe('app.config', () => {
  it('Android: intent filter verificado para koovela.com/{slug} e app.koovela.com/*', () => {
    const f = config.android?.intentFilters?.[0];
    expect(f?.autoVerify).toBe(true);
    expect(f?.data).toEqual([
      { scheme: 'https', host: 'koovela.com', pathPattern: '/..*' },
      { scheme: 'https', host: 'app.koovela.com', pathPattern: '/.*' },
    ]);
    expect(config.android?.package).toBe('com.koovela.app');
  });
  it('iOS: associated domains dos dois hosts', () => {
    expect(config.ios?.associatedDomains).toEqual(['applinks:koovela.com', 'applinks:app.koovela.com']);
    expect(config.ios?.bundleIdentifier).toBe('com.koovela.app');
  });
});
