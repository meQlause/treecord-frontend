import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrintQR, QR } from '../../../../src/shared/art/QR';
import { qrPath } from '../../../../src/shared/art/qrcode';

describe('QR', () => {
  it('draws the code as one path and names it for assistive tech', () => {
    const { container } = render(<QR text="K7Q2" w={40} x={2} y={3} className="pl-qr" />);
    const svg = screen.getByRole('img', { name: 'QR code K7Q2' });

    expect(svg).toHaveClass('pl-qr');
    expect(svg).toHaveAttribute('viewBox', '0 0 29 29');
    expect(svg).toHaveAttribute('width', '40');
    expect(container.querySelector('path')).toHaveAttribute('d', qrPath('K7Q2').d);
  });

  it('stands alone with no position when only text is given', () => {
    render(<QR text="K7Q2" />);

    expect(screen.getByRole('img')).not.toHaveAttribute('x');
  });
});

describe('PrintQR', () => {
  const svgOf = (link: HTMLElement): string =>
    decodeURIComponent((link.getAttribute('href') ?? '').replace('data:image/svg+xml,', ''));

  it('is a download link to an SVG named after the code', () => {
    render(
      <PrintQR text="K7Q2" line="Tree 3001">
        Save QR
      </PrintQR>,
    );
    const link = screen.getByRole('link', { name: 'Save QR' });

    expect(link).toHaveAttribute('download', 'K7Q2.svg');
    expect(link.getAttribute('href')).toMatch(/^data:image\/svg\+xml,/);
  });

  it('prints a 50 mm card with the code and the context line in black on white', () => {
    render(
      <PrintQR text="K7Q2" line="Tree 3001">
        Save QR
      </PrintQR>,
    );
    const svg = svgOf(screen.getByRole('link'));

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="50mm"');
    expect(svg).toContain('fill="#000"');
    expect(svg).toContain('>K7Q2</text>');
    expect(svg).toContain('>Tree 3001</text>');
  });

  it('escapes markup in the context line and honours another width', () => {
    render(
      <PrintQR text="K7Q2" line={'<b>&"'} widthMm={30}>
        Save
      </PrintQR>,
    );
    const svg = svgOf(screen.getByRole('link'));

    expect(svg).toContain('width="30mm"');
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('&#60;b&#62;&#38;&#34;');
  });
});
