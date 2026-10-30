import { render, screen } from '@testing-library/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { PlanterTree } from '../../../../src/features/planter/planter.api';
import { TreeCard } from '../../../../src/features/planter/my-trees.parts';
import { TREE_3001 } from '../../../fidelity/fixtures/planter';

const card = (enforcedByChainlink: boolean) =>
  render(
    <MemoryRouter>
      <TreeCard
        tree={{ ...(TREE_3001 as PlanterTree), enforcedByChainlink }}
        localDeviceId={null}
        index={0}
      />
    </MemoryRouter>,
  );

// FR-244, s16 §7 #9: a tree whose forfeit or removal the Chainlink keeper sent.
describe('S16 tree card — Enforced by Chainlink', () => {
  it('shows the tag beside the status when the keeper enforced one of its forfeits', () => {
    card(true);

    expect(screen.getByText('Enforced by Chainlink')).toBeInTheDocument();
  });

  it('shows no tag otherwise', () => {
    card(false);

    expect(screen.queryByText('Enforced by Chainlink')).not.toBeInTheDocument();
  });
});
