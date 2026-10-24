import type { ReactNode } from 'react';
import { ArrowLink } from './ArrowLink';

// K12. Mockup workspace-ui.jsx:26. Opens a background job's page; the label ("Track job") is copy.
export function JobLink({ id, children }: { id: string; children: ReactNode }) {
  return <ArrowLink to={`/app/jobs/${id}`}>{children}</ArrowLink>;
}
