import { useState, useCallback, useEffect } from 'react';
import { useBooks } from '@/stores/books.store';

// Daily reference rates from the European Central Bank (via frankfurter.app).
// AED and SAR are tied to the dollar, so they stay fixed.
const API_URL = 'https://api.frankfurter.app/latest?from=USD&to=EUR,TRY,GBP';
const STALE_MS = 12 * 3_600_000;

export function useDailyRates({ auto = false }: { auto?: boolean } = {}) {
  const setRates = useBooks((s) => s.setRates);
  const updatedAt = useBooks((s) => s.ratesUpdatedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rates: Record<string, number> };
      // The feed says "1 USD = 0.92 EUR". Vaultex keeps "1 EUR = 1.087 USD".
      const patch: Record<string, number> = {};
      for (const [cur, perUsd] of Object.entries(data.rates)) if (perUsd > 0) patch[cur] = 1 / perUsd;
      setRates(patch);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setRates]);

  useEffect(() => {
    if (!auto) return;
    const stale = !updatedAt || Date.now() - new Date(updatedAt).getTime() > STALE_MS;
    if (stale) void refresh();
  }, [auto, updatedAt, refresh]);

  return { loading, error, updatedAt, refresh };
}
