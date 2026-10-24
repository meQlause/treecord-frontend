import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '../../../../src/shared/ui/EmptyState';

describe('EmptyState', () => {
  it('hero: eyebrow, heading, description and the action, as a status', () => {
    const { container } = render(
      <EmptyState eyebrow="ROOM TO GROW" title="Nothing yet" description="No campaigns.">
        <button type="button">Clear</button>
      </EmptyState>,
    );

    expect(screen.getByRole('status')).toHaveClass('empty-state');
    expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeInTheDocument();
    expect(screen.getByText('ROOM TO GROW')).toHaveClass('eyebrow');
    expect(screen.getByText('No campaigns.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(container.querySelector('.empty-icon.error-icon')).toBeNull();
  });

  it('hero error tone: an alert with the error icon disc', () => {
    const { container } = render(<EmptyState tone="error" title="Could not load" />);

    expect(screen.getByRole('alert')).toHaveClass('empty-state');
    expect(container.querySelector('.empty-icon.error-icon')).not.toBeNull();
    expect(container.querySelector('.ic--warning')).not.toBeNull();
  });

  it('hero: leaves out the eyebrow and description when not given', () => {
    const { container } = render(<EmptyState title="Empty" />);

    expect(container.querySelector('.eyebrow')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });

  it('compact: heading and children in .ws-empty', () => {
    const { container } = render(
      <EmptyState variant="compact" title="No plots">
        <p>Add one</p>
      </EmptyState>,
    );

    expect(container.querySelector('.ws-empty')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'No plots' })).toBeInTheDocument();
    expect(screen.getByText('Add one')).toBeInTheDocument();
  });

  it('inline: art beside the sentence in .rp-empty', () => {
    const { container } = render(
      <EmptyState variant="inline" art={<svg data-testid="art" />}>
        No reports yet
      </EmptyState>,
    );

    expect(container.querySelector('.rp-empty')).not.toBeNull();
    expect(screen.getByTestId('art')).toBeInTheDocument();
    expect(screen.getByText('No reports yet')).toBeInTheDocument();
  });
});
