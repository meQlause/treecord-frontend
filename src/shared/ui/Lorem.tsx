import { fillCopy, type CopyValues } from './approved-copy';

// The approved text of a COPY-nnn id (rule 12); the id stays in `data-copy` so a screen still names its source.
export function Lorem({
  id,
  values,
}: {
  id: string;
  kind?: 'label' | 'sentence';
  values?: CopyValues;
}) {
  return <span data-copy={id}>{fillCopy(id, values)}</span>;
}
