import { describe, expect, it } from 'vitest';
import { DEFAULT_BRAND } from '@/lib/brand/brand-config';

describe('DEFAULT_BRAND (single-brand build)', () => {
  it('uses the Qizhi identity consistently across product surfaces', () => {
    expect(DEFAULT_BRAND.productName).toBe('启知课堂');
    expect(DEFAULT_BRAND.shortName).toBe('启知课堂');
    expect(DEFAULT_BRAND.markSrc).toBe('/brand/qizhi-mark.svg');
    expect(DEFAULT_BRAND.themeColor).toBe('#1478b8');
  });

  it('marks its horizontal logo as already containing the wordmark', () => {
    expect(DEFAULT_BRAND.logoHasWordmark).toBe(true);
    expect(DEFAULT_BRAND.logoSrc).toBe('/brand/qizhi-horizontal.svg');
  });
});
