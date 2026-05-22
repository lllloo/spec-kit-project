import { describe, expect, it } from 'vitest';

describe('vitest baseline', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('has jest-dom matchers loaded (setup.ts)', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    expect(div).toHaveTextContent('hello');
  });
});
