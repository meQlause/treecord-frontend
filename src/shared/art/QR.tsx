import type { ReactNode } from 'react';
import { qrPath } from './qrcode';

// QR art. Mockup workspace-ui.jsx:73-79. On screen white on #111; the print card is #000 on white (design-system §2.4).
const SCREEN_LIGHT = '#fff';
const SCREEN_DARK = '#111';
const PRINT_DARK = '#000';
const PRINT_MM = 50; // docs tags rule: the printed code is 50 mm wide
const CAPTION_ROWS = 9;
const CODE_BASELINE = 2.4;
const LINE_BASELINE = 5.8;
const CODE_FONT = 'font-family="Consolas,monospace" font-size="2.6" font-weight="700"';
const LINE_FONT = 'font-family="Segoe UI,sans-serif" font-size="1.6"';

type QRProps = {
  /** The id to encode, 14 bytes at most. */
  text: string;
  /** Position and width when nested inside another SVG; omit them to size the code with CSS. */
  x?: number;
  y?: number;
  w?: number;
  className?: string;
};

/** A QR code, standalone or inside an SVG (K13). Informative: it names the code it carries. */
function QrCode({ text, x, y, w, className }: QRProps) {
  const { size, d } = qrPath(text);

  return (
    <svg
      className={className}
      x={x}
      y={y}
      width={w}
      height={w}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code ${text}`}
    >
      <rect width={size} height={size} fill={SCREEN_LIGHT} />
      <path d={d} fill={SCREEN_DARK} />
    </svg>
  );
}

const escapeXml = (value: string): string =>
  value.replace(/[<&>"]/g, (char) => `&#${char.charCodeAt(0)};`);

const caption = (centre: number, baseline: number, font: string, content: string): string =>
  `<text x="${centre}" y="${baseline}" text-anchor="middle" ${font}>${escapeXml(content)}</text>`;

/** The print card as SVG source: `widthMm` wide, the code and one line of context under it. */
function printSvg(text: string, line: string, widthMm: number): string {
  const { size, d } = qrPath(text);
  const height = size + CAPTION_ROWS;
  const heightMm = ((widthMm * height) / size).toFixed(1);
  const centre = size / 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${size} ${height}">`,
    `<rect width="${size}" height="${height}" fill="${SCREEN_LIGHT}"/>`,
    `<path d="${d}" fill="${PRINT_DARK}" shape-rendering="crispEdges"/>`,
    caption(centre, size + CODE_BASELINE, CODE_FONT, text),
    caption(centre, size + LINE_BASELINE, LINE_FONT, line),
    '</svg>',
  ].join('');
}

type PrintQRProps = {
  text: string;
  /** The line of context under the code (the tree or slot it tags). */
  line: string;
  /** Print width in millimetres. */
  widthMm?: number;
  children: ReactNode;
};

/** A link that saves a print-ready QR card as `<text>.svg` (K14). */
export function PrintQR({ text, line, widthMm = PRINT_MM, children }: PrintQRProps) {
  return (
    <a
      className="pl-alt"
      href={`data:image/svg+xml,${encodeURIComponent(printSvg(text, line, widthMm))}`}
      download={`${text}.svg`}
    >
      {children}
    </a>
  );
}

export { QrCode as QR };
