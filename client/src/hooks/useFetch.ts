import { useState, useEffect, useCallback } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  useEffect(() => {
    if (!url) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Request failed");
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [url, trigger]);

  return { data, loading, error, refetch };
}
