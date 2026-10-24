import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { GrowthSvg } from './GrowthSvg';
import { VIEW_WIDTH, growthGeometry } from './growth-geometry';
import { useGrowthLoop } from './growth-loop';
import { SHELL_COPY } from './shell.copy';

const { every, tree, proven } = SHELL_COPY.growthWords;

/** The box's height in viewBox units: the art is drawn for the box's real shape (mockup shell.jsx:88). */
function useBoxHeight(root: RefObject<HTMLDivElement | null>): number {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const element = root.current;

    // jsdom has no ResizeObserver; the art simply waits for a real box
    if (element === null || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;

      if (box?.width) {
        setHeight(Math.round((VIEW_WIDTH * box.height) / box.width));
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [root]);

  return height;
}

/** Sidebar art: the tree grows up the 36-month ruler, "Every tree, proven." (the SVG is decorative, the words are read). */
export function GrowthArt() {
  const root = useRef<HTMLDivElement>(null);
  const height = useBoxHeight(root);
  const geo = useMemo(() => growthGeometry(height), [height]);

  useGrowthLoop(root, geo);

  return (
    <div className="sidebar-grow" ref={root}>
      {height > 0 && <GrowthSvg geo={geo} />}
      <p className="ga-text">
        <span className="ga-mask">
          <span className="ga-word">{every}</span>
        </span>{' '}
        <span className="ga-mask">
          <span className="ga-word">{tree}</span>
        </span>
        <br />
        <span className="ga-mask ga-proven">
          <em className="ga-word">{proven}</em>
          <svg
            className="ga-underline"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="ga-line"
              d="M2 7C30 2 62 3 98 5"
              fill="none"
              stroke="#c49a3e"
              strokeWidth="2.4"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
            />
          </svg>
        </span>
      </p>
    </div>
  );
}
