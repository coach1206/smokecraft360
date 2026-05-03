/**
 * useThemeProducts — fetch the inventory slice that belongs to the active
 * theme (cigars for SmokeCraft, wines for PourCraft, etc.).
 *
 * Wraps `GET /api/products?type=<theme.productType>` so kiosk components
 * never hardcode a category. Re-runs whenever the active theme changes.
 *
 * Returns React Query state directly so callers get loading/error semantics
 * without re-implementing them.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";

export interface ThemeProduct {
  id:        string;
  name:      string;
  category:  string;
  price?:    number;
  imageUrl?: string;
  [key: string]: unknown;
}

async function fetchProductsByType(type: string): Promise<ThemeProduct[]> {
  const r = await fetch(`/api/products?type=${encodeURIComponent(type)}`);
  if (!r.ok) throw new Error(`Failed to load products: ${r.status}`);
  return (await r.json()) as ThemeProduct[];
}

export function useThemeProducts(): UseQueryResult<ThemeProduct[], Error> {
  const { theme } = useTheme();
  return useQuery({
    queryKey: ["theme-products", theme.productType],
    queryFn:  () => fetchProductsByType(theme.productType),
    staleTime: 60_000,
  });
}
