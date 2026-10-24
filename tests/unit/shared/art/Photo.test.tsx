import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PHOTOS, Photo } from '../../../../src/shared/art/Photo';
import { StubObserver } from '../../observer';

describe('Photo', () => {
  it('serves the photo from this app at three widths, never from a third party', () => {
    const { container } = render(<Photo kind="coast" />);
    const img = container.querySelector('img') as HTMLImageElement;
    const id = PHOTOS.coast.id;

    expect(img).toHaveAttribute('src', `/photos/${id}-900.jpg`);
    expect(img).toHaveAttribute(
      'srcset',
      `/photos/${id}-600.jpg 600w, /photos/${id}-900.jpg 900w, /photos/${id}-1400.jpg 1400w`,
    );
    expect(img).toHaveAttribute('sizes', '(max-width: 680px) 100vw, 640px');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(container.innerHTML).not.toContain('unsplash.com');
  });

  it('credits the photographer on the image', () => {
    const { container } = render(<Photo kind="forest" />);

    expect(container.querySelector('figcaption.photo-credit')).toHaveTextContent(
      'Photo: Ken Shono / Unsplash',
    );
  });

  it('is decorative (empty alt) unless asked to describe itself', () => {
    const { container, rerender } = render(<Photo kind="avocado" />);

    expect(container.querySelector('img')).toHaveAttribute('alt', '');

    rerender(<Photo kind="avocado" decorative={false} />);
    expect(screen.getByRole('img', { name: PHOTOS.avocado.alt })).toBeInTheDocument();
  });

  it('keeps a caller class beside photo and phases each photo apart', () => {
    const { container } = render(
      <>
        <Photo className="pc-photo-img" />
        <Photo />
      </>,
    );
    const [first, second] = Array.from(container.querySelectorAll('figure'));

    expect(first).toHaveClass('photo', 'pc-photo-img');
    expect(first?.style.getPropertyValue('--phase')).not.toBe(
      second?.style.getPropertyValue('--phase'),
    );
  });

  it('falls back to the illustrated landscape of the same kind when the photo cannot load', () => {
    const { container } = render(<Photo kind="coast" />);

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('svg.landscape')).not.toBeNull();
  });

  it('pauses its drift off screen and stops watching once removed', () => {
    const { container, unmount } = render(<Photo />);
    const figure = container.querySelector('figure') as HTMLElement;
    const observer = StubObserver.watching(figure) as StubObserver;

    observer.report(figure, false);
    expect(figure).toHaveClass('offscreen');

    unmount();
    expect(StubObserver.watching(figure)).toBeUndefined();
  });
});
