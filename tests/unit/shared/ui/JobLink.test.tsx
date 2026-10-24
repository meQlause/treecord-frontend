import { render, screen } from '@testing-library/react';
// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { JobLink } from '../../../../src/shared/ui/JobLink';

describe('JobLink', () => {
  it('links to the job page with the copy it is given', () => {
    render(
      <MemoryRouter>
        <JobLink id="job-7">Track job</JobLink>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Track job' })).toHaveAttribute(
      'href',
      '/app/jobs/job-7',
    );
  });
});
