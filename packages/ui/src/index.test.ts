import { describe, expect, it } from 'vitest';
import { cx } from './index';

describe('ui cx', () => {
  it('joins only truthy class names', () => {
    expect(cx('base', false, undefined, 'active', null, '')).toBe('base active');
  });
});
