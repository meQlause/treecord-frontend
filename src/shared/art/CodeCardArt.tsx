import { FacetTree } from './Glyph';

// K31. Mockup planter-pages.jsx:113-120. An audit challenge's card picture: the code held up beside the tree it must
// be shown with. The CSS loops (sway, bob, blinking caret) pause with the motion gate (§2.10). Palette: §2.4.
const INK = '#26422f';
const SANS = 'Segoe UI, sans-serif';
const CHAR_WIDTH = 8.4; // the caret sits after the last of the monospace characters
const TREE_AT = { x: 76, y: 150, scale: 1.9 };

type CodeCardArtProps = {
  /** The challenge code the auditor asks to see. */
  code: string;
  /** The small line above the code (the card's instruction). */
  caption: string;
};

/** K31. Decorative: the challenge's own text, beside the card, carries the code for assistive tech. */
export function CodeCardArt({ code, caption }: CodeCardArtProps) {
  return (
    <svg
      className="landscape"
      viewBox="0 0 320 184"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="320" height="184" fill="#e9f0de" />
      <polygon points="0,140 100,130 200,138 320,128 320,184 0,184" fill="#cddbbd" />
      <g className="pl-sway">
        <FacetTree {...TREE_AT} />
      </g>
      <g className="pl-bob">
        <g transform="translate(196 92) rotate(-4)">
          <rect x="-74" y="-32" width="148" height="64" rx="9" fill="#fffef9" stroke="#d6e0ca" />
          <text
            y="-11"
            textAnchor="middle"
            fontSize="7.5"
            letterSpacing="1.6"
            fill="#7b8c6c"
            fontFamily={SANS}
          >
            {caption}
          </text>
          <text
            y="17"
            textAnchor="middle"
            fontSize="23"
            letterSpacing="2.4"
            fill={INK}
            fontFamily="ui-monospace, Consolas, monospace"
          >
            {code}
          </text>
          <rect
            className="pl-blink"
            x={code.length * CHAR_WIDTH}
            y="1"
            width="2.4"
            height="20"
            fill="#6f9a58"
          />
        </g>
      </g>
    </svg>
  );
}
