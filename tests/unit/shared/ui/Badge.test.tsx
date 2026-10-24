import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, Tag } from '../../../../src/shared/ui/Badge';

describe('Badge', () => {
  it('takes its class from the status, with a dot', () => {
    const { container } = render(<Badge status="Funding" />);

    expect(container.firstChild).toHaveClass('badge', 'funding');
    expect(container.querySelector('span > span')).not.toBeNull();
    expect(screen.getByText('Funding')).toBeInTheDocument();
  });
});

describe('Tag', () => {
  it('reads underscores as spaces and classes spaces as dashes', () => {
    render(<Tag>needs_review</Tag>);

    expect(screen.getByText('needs review')).toHaveClass('ws-tag', 'needs_review');
  });

  it('dashes a spaced status in the class', () => {
    render(<Tag>On chain</Tag>);

    expect(screen.getByText('On chain')).toHaveClass('on-chain');
  });
});
