import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '../../../../src/shared/ui/Card';

describe('Card', () => {
  it.each([
    ['catalog', 'campaign-card'],
    ['review', 'ws-review'],
    ['skeleton', 'skeleton-card'],
  ] as const)('%s renders the mockup class %s', (variant, className) => {
    const { container } = render(<Card variant={variant}>x</Card>);

    expect(container.firstChild).toHaveClass(className);
  });

  it('is the catalog card by default', () => {
    const { container } = render(<Card />);

    expect(container.firstChild).toHaveClass('campaign-card');
  });
});
