import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stack } from '../../../../src/shared/ui/Stack';

describe('Stack', () => {
  it('lays children in a column on a spacing step', () => {
    const { container } = render(<Stack>x</Stack>);
    const stack = container.firstChild as HTMLElement;

    expect(stack.style.flexDirection).toBe('column');
    expect(stack.style.gap).toBe('var(--space-7)');
  });

  it('takes a row, a gap step and extra style', () => {
    const { container } = render(
      <Stack direction="row" gap={3} style={{ alignItems: 'center' }}>
        x
      </Stack>,
    );
    const stack = container.firstChild as HTMLElement;

    expect(stack.style.flexDirection).toBe('row');
    expect(stack.style.gap).toBe('var(--space-3)');
    expect(stack.style.alignItems).toBe('center');
  });
});
