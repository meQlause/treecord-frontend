import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../../../src/shared/ui/Button';

describe('Button', () => {
  it('renders the mockup class of each variant', () => {
    render(
      <>
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="text">Text</Button>
        <Button variant="sign-in">Sign in</Button>
        <Button variant="icon" aria-label="Close" />
      </>,
    );

    expect(screen.getByText('Primary')).toHaveClass('button', 'primary');
    expect(screen.getByText('Outline')).toHaveClass('button', 'outline');
    expect(screen.getByText('Text')).toHaveClass('text-button');
    expect(screen.getByText('Sign in')).toHaveClass('sign-in-button');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('icon-button');
  });

  it('is a plain button, not a submit, unless told', () => {
    render(<Button>Go</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('shows a trailing icon', () => {
    const { container } = render(<Button icon="arrow">Go</Button>);

    expect(container.querySelector('.ic--arrow')).not.toBeNull();
  });

  it('while busy: swaps the label, disables itself, hides the icon and says so to assistive tech', () => {
    const { container } = render(
      <Button busy icon="arrow" busyLabel="Saving…">
        Go
      </Button>,
    );
    const button = screen.getByRole('button');

    expect(button).toHaveTextContent('Saving…');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('uses "Processing…" when busy without a label of its own', () => {
    render(<Button busy>Go</Button>);

    expect(screen.getByRole('button')).toHaveTextContent('Processing…');
  });

  it('does not click while busy or disabled, and clicks otherwise', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button busy onClick={onClick}>
        Go
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    rerender(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
