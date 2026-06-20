import { useState, useEffect, useCallback } from "react";
import { getCached } from "./prefetchCache";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  durationMs: number | null;
  fetchedAt: string | null;
  refetch: () => void;
}

export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setDurationMs(null);
      setFetchedAt(null);
      return;
    }
    // Serve instantly from the background prefetch cache when available
    // (skip on explicit refetch so the user can force a fresh load).
    if (trigger === 0) {
      const cached = getCached(url);
      if (cached) {
        setData(cached.data as T);
        setDurationMs(cached.durationMs);
        setFetchedAt(cached.fetchedAt);
        setError(null);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    const start = performance.now();
    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
          setFetchedAt(new Date().toLocaleTimeString());
        } else {
          setError(json.error || "Request failed");
        }
      })
      .catch(err => setError(err.message))
      .finally(() => {
        setDurationMs(Math.round(performance.now() - start));
        setLoading(false);
      });
  }, [url, trigger]);

  return { data, loading, error, durationMs, fetchedAt, refetch };
}
