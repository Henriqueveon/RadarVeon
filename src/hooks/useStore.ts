import { useState, useEffect, useCallback } from "react";
import { subscribe } from "@/lib/store";

/**
 * Hook that forces re-render when the store changes.
 * Returns a `version` counter — use it as a useMemo/useEffect dependency
 * to ensure derived values recompute on store mutations.
 */
export function useStore() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsub = subscribe(() => setVersion((v) => v + 1));
    return () => {
      unsub();
    };
  }, []);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { refresh, version };
}
