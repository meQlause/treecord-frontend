import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Grid } from '../../../../src/shared/ui/Grid';

describe('Grid', () => {
  it('is the catalog grid by default and the main-plus-rail layout on request', () => {
    const { container } = render(
      <>
        <Grid>a</Grid>
        <Grid variant="rail">b</Grid>
      </>,
    );

    expect(container.children[0]).toHaveClass('campaign-grid');
    expect(container.children[1]).toHaveClass('detail-layout');
  });
});
