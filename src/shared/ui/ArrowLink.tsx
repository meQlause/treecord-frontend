// eslint-disable-next-line import/no-unresolved -- react-router publishes only an exports map, which the import plugin's resolver cannot read
import { Link, type LinkProps } from 'react-router';
import { Icon } from '../art/Icon';

// K11. Mockup workspace-ui.jsx:5 (`Link`). A router link with a trailing arrow.
const ARROW_SIZE = 15;

export function ArrowLink({ children, ...props }: LinkProps) {
  return (
    <Link {...props}>
      {children}
      <Icon name="arrow" size={ARROW_SIZE} />
    </Link>
  );
}
