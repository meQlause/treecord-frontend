import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodeCardArt } from '../../../../src/shared/art/CodeCardArt';

describe('CodeCardArt', () => {
  it('is decorative and shows the caption above the code it is given', () => {
    const { container } = render(<CodeCardArt code="K7Q2" caption="Show in the scene" />);
    const [caption, code] = Array.from(container.querySelectorAll('text'));

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(caption).toHaveTextContent('Show in the scene');
    expect(code).toHaveTextContent('K7Q2');
  });

  it('puts the blinking caret after the last character, further out for a longer code', () => {
    const short = render(<CodeCardArt code="K7Q2" caption="c" />);
    const shortX = Number(short.container.querySelector('.pl-blink')?.getAttribute('x'));

    short.unmount();

    const long = render(<CodeCardArt code="K7Q2-9X" caption="c" />);
    const longX = Number(long.container.querySelector('.pl-blink')?.getAttribute('x'));

    expect(shortX).toBeCloseTo(33.6);
    expect(longX).toBeGreaterThan(shortX);
  });

  it('plants the tree beside the card, with the sway and bob loops on their own groups', () => {
    const { container } = render(<CodeCardArt code="K7Q2" caption="c" />);

    expect(container.querySelectorAll('.pl-sway polygon')).toHaveLength(4);
    expect(container.querySelector('.pl-bob text')).not.toBeNull();
  });
});
