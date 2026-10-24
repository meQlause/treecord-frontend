import { Logo } from '../../shared/art/Logo';
import { FooterLine } from './FooterLine';
import { SHELL_COPY } from './shell.copy';

const MARK_SIZE = 22;

/** FR-016: the brand link, the rolling line, the copyright. */
export function Footer() {
  return (
    <footer className="footer site-footer">
      <a className="brand footer-brand" href="/landing/">
        <Logo size={MARK_SIZE} />
        {SHELL_COPY.brandFooter}
      </a>
      <FooterLine />
      <span className="ft-copy">{SHELL_COPY.copyright}</span>
    </footer>
  );
}
