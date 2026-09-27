"use client";

import { useCallback, useEffect, useState } from "react";

export function usePoll<T>(url: string | null, intervalMs = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(payload.error || "We couldn't reach Heads Up. Try again.");
        }
        setData(payload as T);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "We couldn't reach Heads Up. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    if (intervalMs <= 0) {
      return () => {
        cancelled = true;
      };
    }
    const id = setInterval(() => void load(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [url, intervalMs, tick]);

  return { data, error, loading, reload };
}
