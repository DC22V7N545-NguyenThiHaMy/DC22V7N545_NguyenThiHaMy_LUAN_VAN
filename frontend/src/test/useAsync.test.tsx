import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAsync } from '../hooks/useAsync';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
};

describe('useAsync', () => {
  it('keeps the previous data while the next request is loading', async () => {
    const second = deferred<string>();
    const { result, rerender } = renderHook(({ id }) => useAsync(() => (id === 1 ? Promise.resolve('one') : second.promise), [id]), { initialProps: { id: 1 } });
    await waitFor(() => expect(result.current.data).toBe('one'));
    rerender({ id: 2 });
    expect(result.current.data).toBe('one');
    expect(result.current.loading).toBe(true);
    await act(async () => second.resolve('two'));
    await waitFor(() => expect(result.current.data).toBe('two'));
  });

  it('ignores a late answer from a superseded request', async () => {
    const slow = deferred<string>();
    const { result, rerender } = renderHook(({ id }) => useAsync(() => (id === 1 ? slow.promise : Promise.resolve('fresh')), [id]), { initialProps: { id: 1 } });
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe('fresh'));
    await act(async () => slow.resolve('stale'));
    expect(result.current.data).toBe('fresh');
  });

  it('marks the body as navigating only while a request is pending', async () => {
    const pending = deferred<number>();
    renderHook(() => useAsync(() => pending.promise, []));
    expect(document.body.classList.contains('is-navigating')).toBe(true);
    await act(async () => pending.resolve(1));
    await waitFor(() => expect(document.body.classList.contains('is-navigating')).toBe(false));
  });

  it('reports errors without data', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject(new Error('Không tìm thấy')), []));
    await waitFor(() => expect(result.current.error?.message).toBe('Không tìm thấy'));
    expect(result.current.data).toBeUndefined();
  });
});
