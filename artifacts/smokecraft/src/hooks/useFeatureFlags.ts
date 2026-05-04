import { useTheme } from "@/contexts/ThemeContext";

export function useFeatureFlags(): Record<string, boolean> {
  const { featureFlags } = useTheme();
  return featureFlags;
}

export function useFeatureFlag(name: string, defaultValue = false): boolean {
  const flags = useFeatureFlags();
  return flags[name] ?? defaultValue;
}
