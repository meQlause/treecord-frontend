// Mockup carbon.jsx:62. A faceted gold coin in the low-poly language of the Treecord mark; SVG only (it is drawn
// inside another `<svg>`), so the art palette applies (design-system §2.4).
type Point = readonly [number, number];

const SIDES = 10;
const OUTER_RADIUS = 40;
const INNER_RADIUS = 29;
const EDGE_DROP = 6;
const SHADOW = '#9c7428';
const GOLD = [
  '#f4dc8e',
  '#f0d27a',
  '#e6c46e',
  '#d9b259',
  '#c99f45',
  '#bb9038',
  '#c49a3e',
  '#d0a94e',
  '#dcb85f',
  '#ebcb74',
];
const LIT_FACE = '#e8c76f';
const SHADED_FACE = '#d8b358';
const LIT_SIDES = 6;
const MARK = 'M-9 9C-13-5-3-13 12-13c0 14-6 22-19 21m-4 4 13-13';
const DIM_OPACITY = 0.45;
const DIM_FILTER = 'grayscale(.8)';
const SHINE_TURN = 24;
const SHINE_SIZE = 60;
const SHINE_WIDTH = 18;

const ring = (centreY: number, radius: number): Point[] =>
  Array.from({ length: SIDES }, (_item, side) => {
    const angle = (Math.PI * 2 * side) / SIDES - Math.PI / 2;

    return [radius * Math.cos(angle), centreY + radius * Math.sin(angle)];
  });
const points = (list: readonly Point[]): string =>
  list.map((point) => point.map((value) => value.toFixed(1)).join(',')).join(' ');

const OUTER = ring(0, OUTER_RADIUS);
const INNER = ring(0, INNER_RADIUS);
const BASE = points(ring(EDGE_DROP, OUTER_RADIUS));
const RIM = points(OUTER);
const FACETS = OUTER.map((outer, side) => {
  const next = (side + 1) % SIDES;

  return points([outer, OUTER[next] ?? outer, INNER[next] ?? outer, INNER[side] ?? outer]);
});
const LIT = points(INNER.slice(0, LIT_SIDES));
const SHADED = points([...INNER.slice(LIT_SIDES - 1), INNER[0] ?? [0, 0]]);

type FacetCoinProps = {
  /** Centre in the parent SVG. */
  cx: number;
  cy: number;
  /** Radius in the parent SVG (the coin is drawn at 40). */
  r: number;
  /** Unique per coin on the page: names its clip path. */
  id: string;
  /** Sold out or paused: grey, no shine. */
  dim?: boolean;
};

/** K20. One faceted gold coin with a rim, lit from the upper right, a shine passing over it. */
export function FacetCoin({
  cx: centreX,
  cy: centreY,
  r: radius,
  id,
  dim = false,
}: FacetCoinProps) {
  return (
    <g transform={`translate(${centreX} ${centreY}) scale(${radius / OUTER_RADIUS})`}>
      <g
        className="ca-coin"
        opacity={dim ? DIM_OPACITY : 1}
        style={dim ? { filter: DIM_FILTER } : undefined}
      >
        <clipPath id={`coin-${id}`}>
          <polygon points={RIM} />
        </clipPath>
        <polygon points={BASE} fill={SHADOW} />
        {FACETS.map((facet, side) => (
          <polygon key={facet} points={facet} fill={GOLD[side]} />
        ))}
        <polygon points={LIT} fill={LIT_FACE} />
        <polygon points={SHADED} fill={SHADED_FACE} />
        <path
          d={MARK}
          fill="none"
          stroke="#7d5f22"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {!dim && (
          <g clipPath={`url(#coin-${id})`}>
            <g transform={`rotate(${SHINE_TURN})`}>
              <rect
                className="ca-shine"
                x={-SHINE_SIZE}
                y={-SHINE_SIZE}
                width={SHINE_WIDTH}
                height={SHINE_SIZE * 2}
                fill="#fff"
              />
            </g>
          </g>
        )}
      </g>
    </g>
  );
}
