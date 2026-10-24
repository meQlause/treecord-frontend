import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { watchOffscreen } from '../motion/offscreen';
import { Landscape, type LandscapeKind } from './Landscape';

// K4. Mockup art.jsx:143-168. Campaign photos are Unsplash-licensed and served from this app (`public/photos`, three
// widths each; docs/FE/fidelity.md §2): no third-party host. Credit is shown on the image.
// `lagoon` is a mockup-only fixture: S8 settled art by species (FD-23), so its photo is not vendored (fidelity.md §7).
export type PhotoKind = Exclude<LandscapeKind, 'lagoon'>;

export const PHOTOS: Record<PhotoKind, { id: string; by: string; alt: string }> = {
  coast: {
    id: '1672153920077-8bea4b38b077',
    by: 'Lesya Soboleva',
    alt: 'Mangrove trees rising from shallow coastal water, Nusa Lembongan, Bali',
  },
  forest: {
    id: '1592303032319-515be296cb1d',
    by: 'Ken Shono',
    alt: 'Tall trees in a tropical rainforest, Kalimantan',
  },
  grove: {
    id: '1695354059874-51c9ce6cc77f',
    by: 'fajriyan',
    alt: 'Lush green forest at Coban Talun, Batu, East Java',
  },
  orchard: {
    id: '1764232288881-a9293b590410',
    by: 'The Manh',
    alt: 'Durian fruits hanging from a tree branch',
  },
  avocado: {
    id: '1542820242-a3699d4f2bfe',
    by: 'Joanna Stołowicz',
    alt: 'Green avocado growing among leaves',
  },
};

const SMALL = 600;
const MEDIUM = 900;
const LARGE = 1400;
const WIDTHS = [SMALL, MEDIUM, LARGE];
const DEFAULT_WIDTH = MEDIUM;
const SIZES = '(max-width: 680px) 100vw, 640px';
const PHASE_STEP = 1.7;
const PHASE_CYCLE = 12;
let instances = 0;

const photoUrl = (id: string, width: number): string => `/photos/${id}-${width}.jpg`;

/** A different drift phase per photo, so a grid of photos does not pan in lockstep. */
const nextPhase = (): string => {
  const phase = -((instances * PHASE_STEP) % PHASE_CYCLE);

  instances += 1;

  return `${phase.toFixed(2)}s`;
};

type PhotoProps = {
  kind?: PhotoKind;
  /** True when a heading or caption beside the photo already says what it shows (empty alt). */
  decorative?: boolean;
  className?: string;
};

/**
 * K4. A slowly drifting photo (Ken Burns). Falls back to the illustrated landscape if the photo cannot load (offline,
 * or a file that is not there).
 */
export function Photo({ kind = 'forest', decorative = true, className = '' }: PhotoProps) {
  const ref = useRef<HTMLElement>(null);
  const [failed, setFailed] = useState(false);
  const [phase] = useState(nextPhase);
  const photo = PHOTOS[kind];

  useEffect(() => (ref.current === null ? undefined : watchOffscreen(ref.current)), []);

  if (failed) {
    return <Landscape kind={kind} />;
  }

  return (
    <figure
      ref={ref}
      className={`photo ${className}`}
      style={{ '--phase': phase } as CSSProperties}
    >
      <img
        src={photoUrl(photo.id, DEFAULT_WIDTH)}
        srcSet={WIDTHS.map((width) => `${photoUrl(photo.id, width)} ${width}w`).join(', ')}
        sizes={SIZES}
        alt={decorative ? '' : photo.alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <figcaption className="photo-credit">Photo: {photo.by} / Unsplash</figcaption>
    </figure>
  );
}
