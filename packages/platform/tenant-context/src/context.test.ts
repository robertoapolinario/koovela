import { describe, expect, it } from 'vitest';
import { currentContext, runWithContext } from './index.ts';

describe('tenant-context', () => {
  it('propaga por await e isola contextos concorrentes', async () => {
    const read = async (id: string) =>
      runWithContext({ request_id: id, correlation_id: id }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return currentContext()?.request_id;
      });
    expect(await Promise.all([read('a'), read('b')])).toEqual(['a', 'b']);
    expect(currentContext()).toBeUndefined();
  });
});
