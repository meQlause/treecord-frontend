import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from '../../../../src/shared/ui/Panel';

describe('Panel', () => {
  it('titles a section with an icon and shows children and the aside', () => {
    const { container } = render(
      <Panel title="Plots" icon="pin" aside={<button type="button">Edit</button>}>
        <p>Inside</p>
      </Panel>,
    );

    expect(screen.getByRole('heading', { name: 'Plots' })).toBeInTheDocument();
    expect(container.querySelector('.ws-panel-head .ic--pin')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('Inside')).toBeInTheDocument();
  });

  it('defaults to the tree icon', () => {
    const { container } = render(<Panel title="Trees" />);

    expect(container.querySelector('.ic--tree')).not.toBeNull();
  });
});
