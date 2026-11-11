import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** Small data-loading hook: returns data, loading, error and a reload function */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError('');
    api
      .get<T>(path)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}
