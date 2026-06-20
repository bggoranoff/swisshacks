// Simple module-level in-memory cache for warming client data in the background.
// Keyed by request URL. Each entry stores the resolved API `data` payload along
// with timing metadata so useFetch can hydrate instantly without a spinner.

export interface CacheEntry {
  data: unknown;
  durationMs: number | null;
  fetchedAt: string | null;
}

const cache = new Map<string, CacheEntry>();
// Tracks in-flight prefetches so we never fire the same URL twice.
const inFlight = new Map<string, Promise<void>>();

export function getCached(url: string): CacheEntry | undefined {
  return cache.get(url);
}

// Fetch a URL once and store its successful payload in the cache.
// Failures are swallowed (and not cached) so on-demand fetch + mock fallback
// can still take over when a client is selected.
export function prefetch(url: string): Promise<void> {
  if (cache.has(url)) return Promise.resolve();
  const existing = inFlight.get(url);
  if (existing) return existing;

  const start = performance.now();
  const p = fetch(url)
    .then((res) => res.json())
    .then((json) => {
      if (json && json.success) {
        cache.set(url, {
          data: json.data,
          durationMs: Math.round(performance.now() - start),
          fetchedAt: new Date().toLocaleTimeString(),
        });
      }
    })
    .catch(() => {
      // Ignore — leave URL uncached so useFetch falls back to on-demand fetch.
    })
    .finally(() => {
      inFlight.delete(url);
    });

  inFlight.set(url, p);
  return p;
}

// Warm DNA / portfolio / news for a list of client ids, staggered so the
// burst of requests doesn't block the UI thread or saturate the connection.
export function prefetchClients(ids: string[]): void {
  ids.forEach((id, i) => {
    const urls = [
      `/api/clients/${id}/dna`,
      `/api/clients/${id}/portfolio`,
      `/api/clients/${id}/news`,
    ];
    setTimeout(() => {
      urls.forEach((url) => {
        void prefetch(url);
      });
    }, i * 150);
  });
}
