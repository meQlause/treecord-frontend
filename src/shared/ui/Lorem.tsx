// Placeholder for a COPY-nnn id with no approved text yet (rule 12). The id shows in `data-copy` and on hover.
const LOREM = {
  label: 'Lorem ipsum',
  sentence: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
};

export function Lorem({ id, kind = 'sentence' }: { id: string; kind?: keyof typeof LOREM }) {
  return (
    <span data-copy={id} title={id}>
      {LOREM[kind]}
    </span>
  );
}
