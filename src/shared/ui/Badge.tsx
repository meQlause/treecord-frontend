import type { ReactNode } from 'react';

/** P8, mockup main.jsx:26. The status decides the class (`funding`, `active`, `completed`, `refunding`), with a dot. */
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <span />
      {status}
    </span>
  );
}

/** P8, mockup workspace-ui.jsx:8. A neutral/pending/failed record tag; underscores read as spaces. */
export function Tag({ children }: { children: string }): ReactNode {
  return (
    <span className={`ws-tag ${children.toLowerCase().replaceAll(' ', '-')}`}>
      {children.replaceAll('_', ' ')}
    </span>
  );
}
