import { useCallback, useEffect, useRef, useState } from 'react';

let pending = 0;
// Drives the thin progress bar in experience.css while any page data is loading.
function trackNavigation(delta: number) {
  pending = Math.max(0, pending + delta);
  document.body.classList.toggle('is-navigating', pending > 0);
}

/**
 * Runs `loader` whenever `deps` change. The previous data stays visible while the next request is in flight
 * (like the old page swap) and a late response from a superseded request is ignored.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const token = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const mine = ++token.current;
    setLoading(true);
    trackNavigation(1);
    loaderRef.current().then(
      result => { if (mine === token.current) { setData(result); setError(undefined); } },
      err => { if (mine === token.current) setError(err instanceof Error ? err : new Error(String(err))); },
    ).finally(() => {
      trackNavigation(-1);
      if (mine === token.current) setLoading(false);
    });
    return () => { token.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion(v => v + 1), []);
  const mutate = useCallback((next: T) => setData(next), []);
  return { data, error, loading, reload, mutate };
}
