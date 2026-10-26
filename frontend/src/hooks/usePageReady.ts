import { useEffect } from 'react';
import { motionAllowed } from '../format';

const REVEAL = '.category-card,.product-card,.journal-card,.section-heading,.style-tile,.story-copy,.faq-section>div,.quiz-copy';

/**
 * Page-level polish once a page has real content: document title, entry animation and
 * scroll-reveal for the editorial blocks. Re-runs when `key` (path + query) changes.
 */
export function usePageReady(ready: boolean, key: string, title?: string) {
  useEffect(() => {
    if (!ready) return;
    const main = document.getElementById('main');
    const heading = main?.querySelector('h1')?.textContent;
    document.title = (title ?? (location.pathname === '/' ? 'Phong cách là chính bạn' : heading || 'Khám phá phong cách')) + ' — VELASTYLE';
    if (!motionAllowed() || !main) return;
    main.animate([{ opacity: 0.3, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)' });
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { threshold: 0.06, rootMargin: '0px 0px 35px 0px' });
    document.querySelectorAll<HTMLElement>(REVEAL).forEach((el, i) => {
      el.classList.add('scroll-reveal');
      el.style.setProperty('--reveal-delay', `${Math.min(i % 4, 3) * 65}ms`);
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ready, key, title]);
}
