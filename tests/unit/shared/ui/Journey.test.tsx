import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Journey, type JourneyStep } from '../../../../src/shared/ui/Journey';

const STEPS: JourneyStep[] = [
  { icon: 'check', label: 'Issued', note: 'SRN PPI', state: 'done' },
  { icon: 'clock', label: 'Registry', note: 'Pending', state: 'now' },
];

describe('Journey', () => {
  it('names the region, lists the steps with their captions and marks their state', () => {
    render(<Journey title="Retirement journey" label="Journey" steps={STEPS} />);

    const region = screen.getByRole('region', { name: 'Journey' });
    const [first, second] = screen.getAllByRole('listitem');

    expect(region).toContainElement(screen.getByRole('heading', { name: 'Retirement journey' }));
    expect(first).toHaveClass('done');
    expect(second).toHaveClass('now');
    expect(second).toHaveTextContent('RegistryPending');
  });

  it('draws the track to `fill` when given, and leaves it to the stylesheet when not', () => {
    const { container, rerender } = render(<Journey title="t" label="l" steps={STEPS} />);

    expect(container.querySelector('.rc-track b')).not.toHaveAttribute('style');
    rerender(<Journey title="t" label="l" steps={STEPS} fill={0.5} />);
    expect(container.querySelector('.rc-track b')).toHaveStyle({ width: '50%' });
  });
});
