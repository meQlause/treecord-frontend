import { describe, expect, it, vi } from 'vitest';
import { syncMotion } from '../../../../src/shared/motion/sync';
import { StubObserver } from '../../observer';

const setup = (paused: boolean) => {
  const app = document.createElement('div');
  const element = document.createElement('div');
  const animation = { pause: vi.fn(), play: vi.fn() };

  app.className = paused ? 'app motion-paused' : 'app';
  app.append(element);
  document.body.append(app);

  return { app, element, animation, stop: syncMotion(element, [animation]) };
};

describe('syncMotion', () => {
  it('plays on screen and pauses when the app says pause motion', async () => {
    const { app, animation } = setup(false);

    expect(animation.play).toHaveBeenCalled();
    app.classList.add('motion-paused');
    await Promise.resolve();
    expect(animation.pause).toHaveBeenCalled();
  });

  it('starts paused when the app is already paused', () => {
    const { animation } = setup(true);

    expect(animation.pause).toHaveBeenCalledTimes(1);
    expect(animation.play).not.toHaveBeenCalled();
  });

  it('pauses off screen and plays again on screen', () => {
    const { element, animation } = setup(false);
    const observer = StubObserver.watching(element) as StubObserver;

    observer.report(element, false);
    expect(animation.pause).toHaveBeenCalled();
    observer.report(element, true);
    expect(animation.play).toHaveBeenCalledTimes(2);
  });

  it('works outside an .app and stops watching on cleanup', () => {
    const element = document.createElement('div');
    const animation = { pause: vi.fn(), play: vi.fn() };
    const stop = syncMotion(element, [animation]);

    expect(animation.play).toHaveBeenCalled();
    stop();
    expect(StubObserver.watching(element)).toBeUndefined();
  });
});
