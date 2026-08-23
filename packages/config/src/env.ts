/**
 * Minimal, dependency-free environment helpers.
 *
 * Every value in this package has a safe development default so the app boots
 * without a populated `.env`. Anything that MUST be set before going live is
 * validated by `assertProductionEnv()` rather than silently defaulted.
 */

export type RuntimeMode = "development" | "test" | "production";

export function readEnv(key: string, fallback?: string): string | undefined {
  const raw = typeof process !== "undefined" ? process.env?.[key] : undefined;
  if (raw === undefined || raw === "") return fallback;
  return raw;
}

export function readString(key: string, fallback: string): string {
  return readEnv(key) ?? fallback;
}

export function readNumber(key: string, fallback: number): number {
  const raw = readEnv(key);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readBoolean(key: string, fallback: boolean): boolean {
  const raw = readEnv(key)?.toLowerCase();
  if (raw === undefined) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function readList(key: string, fallback: string[] = []): string[] {
  const raw = readEnv(key);
  if (raw === undefined) return fallback;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function runtimeMode(): RuntimeMode {
  const raw = readEnv("NODE_ENV", "development");
  if (raw === "production" || raw === "test") return raw;
  return "development";
}

export const isProduction = (): boolean => runtimeMode() === "production";
export const isTest = (): boolean => runtimeMode() === "test";
