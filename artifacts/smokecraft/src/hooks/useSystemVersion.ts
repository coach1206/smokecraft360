import { useEffect, useRef } from "react";

const CLIENT_VERSION = "1.0.0";

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

export function useSystemVersion() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    async function check() {
      try {
        const res = await fetch("/api/system/version");
        if (!res.ok) return;
        const data = (await res.json()) as {
          version: string;
          minSupportedVersion: string;
          forceRefresh: boolean;
        };

        if (data.forceRefresh) {
          window.location.reload();
          return;
        }

        if (compareVersions(CLIENT_VERSION, data.minSupportedVersion) < 0) {
          window.location.reload();
        }
      } catch {
        /* network error — silently continue */
      }
    }

    void check();
  }, []);
}
