import { useEffect, type RefObject } from 'react';
import { motionAllowed } from '../format';

/**
 * Entrance animation for the editorial covers (home hero, "for you" hero) and the soft pointer drift
 * on fine-pointer devices. Re-runs when `deps` change, like a fresh page render used to.
 */
export function useEditorialMotion(area: RefObject<HTMLElement | null>, selector: string, deps: unknown[]) {
  useEffect(() => {
    const root = area.current;
    if (!root || !motionAllowed()) return;
    root.querySelectorAll<HTMLElement>(selector).forEach((element, index) =>
      element.animate([{ opacity: 0, translate: '0 18px' }, { opacity: 1, translate: '0 0' }], { duration: 850, delay: Math.min(index * 85, 600), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    if (!matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        root.style.setProperty('--drift-x', `${((event.clientX - rect.left) / rect.width - 0.5) * 8}px`);
        root.style.setProperty('--drift-y', `${((event.clientY - rect.top) / rect.height - 0.5) * 6}px`);
        frame = 0;
      });
    };
    const onLeave = () => { root.style.setProperty('--drift-x', '0px'); root.style.setProperty('--drift-y', '0px'); };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
