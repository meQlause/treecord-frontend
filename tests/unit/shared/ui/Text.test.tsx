import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Text } from '../../../../src/shared/ui/Text';

describe('Text', () => {
  it.each([
    ['display', 'H1'],
    ['detail', 'H1'],
    ['section', 'H2'],
    ['panel', 'H2'],
    ['body', 'P'],
    ['meta', 'SMALL'],
    ['mono', 'CODE'],
  ] as const)('%s is a %s', (variant, tag) => {
    render(<Text variant={variant}>hello</Text>);

    expect(screen.getByText('hello').tagName).toBe(tag);
  });

  it('is a paragraph by default', () => {
    render(<Text>hello</Text>);

    expect(screen.getByText('hello').tagName).toBe('P');
  });

  it('an eyebrow carries its small line, a mono text the code class', () => {
    const { container } = render(
      <>
        <Text variant="eyebrow">EVERY TREE</Text>
        <Text variant="mono">0xabc</Text>
      </>,
    );

    expect(container.querySelector('.eyebrow .tiny-line')).not.toBeNull();
    expect(screen.getByText('0xabc')).toHaveClass('ev-code');
  });
});
