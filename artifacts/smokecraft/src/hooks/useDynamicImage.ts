/**
 * useDynamicImage — fetches an AI-generated craft style image from the backend.
 *
 * The backend caches generated images in Cloudinary so each prompt is only
 * paid for once. The hook returns `null` while loading or on error, so callers
 * can always fall back to a static local image.
 *
 * Usage:
 *   const { url } = useDynamicImage("pour", "smooth");
 *   // url is null while loading, then a Cloudinary URL once ready
 */

import { useState, useEffect, useRef } from "react";
import { getAuthHeaders }              from "@/services/auth";

export type CraftType = "pour" | "brew" | "smoke" | "vape";

interface UseDynamicImageOptions {
  craft:     CraftType;
  styleId:   string;
  moodId?:   string;
  userInput?: {
    mood?:      string;
    strength?:  string;
    timeOfDay?: string;
  };
  /** Skip the fetch entirely (useful when feature flag is off) */
  disabled?: boolean;
}

interface UseDynamicImageResult {
  url:     string | null;
  loading: boolean;
  error:   boolean;
}

const IN_FLIGHT = new Map<string, Promise<string | null>>();
const CACHE     = new Map<string, string | null>();

async function fetchImageUrl(
  craft:      CraftType,
  styleId:    string,
  moodId?:    string,
  userInput?: UseDynamicImageOptions["userInput"],
): Promise<string | null> {
  const res = await fetch("/api/ai/generate-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ craft, styleId, moodId, userInput }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { url?: string };
  return data.url ?? null;
}

export function useDynamicImage({
  craft,
  styleId,
  moodId,
  userInput,
  disabled = false,
}: UseDynamicImageOptions): UseDynamicImageResult {
  const cacheKey = `${craft}:${styleId}:${moodId ?? ""}`;
  const [url,     setUrl]     = useState<string | null>(CACHE.get(cacheKey) ?? null);
  const [loading, setLoading] = useState<boolean>(!disabled && !CACHE.has(cacheKey));
  const [error,   setError]   = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (disabled) { setLoading(false); return; }

    if (CACHE.has(cacheKey)) {
      const cached = CACHE.get(cacheKey) ?? null;
      setUrl(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    let p = IN_FLIGHT.get(cacheKey);
    if (!p) {
      p = fetchImageUrl(craft, styleId, moodId, userInput).catch(() => null);
      IN_FLIGHT.set(cacheKey, p);
    }

    p.then((result) => {
      CACHE.set(cacheKey, result);
      IN_FLIGHT.delete(cacheKey);
      if (!mounted.current) return;
      setUrl(result);
      setLoading(false);
      if (!result) setError(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, disabled]);

  return { url, loading, error };
}

/**
 * useCraftImages — fetches AI images for all styles in a craft in parallel.
 * Returns a map of styleId → Cloudinary URL (or null while pending/failed).
 */
export function useCraftImages(
  craft:    CraftType,
  styleIds: string[],
  disabled = false,
): Record<string, string | null> {
  const [images, setImages] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const id of styleIds) {
      const key = `${craft}:${id}:`;
      init[id] = CACHE.get(key) ?? null;
    }
    return init;
  });

  useEffect(() => {
    if (disabled || styleIds.length === 0) return;
    let cancelled = false;

    styleIds.forEach((styleId) => {
      const cacheKey = `${craft}:${styleId}:`;
      if (CACHE.has(cacheKey)) {
        setImages(prev => ({ ...prev, [styleId]: CACHE.get(cacheKey) ?? null }));
        return;
      }

      let p = IN_FLIGHT.get(cacheKey);
      if (!p) {
        p = fetchImageUrl(craft, styleId, undefined, undefined).catch(() => null);
        IN_FLIGHT.set(cacheKey, p);
      }

      p.then((result) => {
        CACHE.set(cacheKey, result);
        IN_FLIGHT.delete(cacheKey);
        if (!cancelled) {
          setImages(prev => ({ ...prev, [styleId]: result }));
        }
      });
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [craft, disabled, styleIds.join(",")]);

  return images;
}
