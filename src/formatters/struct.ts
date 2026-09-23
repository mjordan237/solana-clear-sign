import { sanitizeDisplayText } from "../security.js";

export interface FlatField { path: string; label: string; value: unknown }

export function flattenStruct(value: unknown, options: { prefix?: string; customPrefix?: Record<string, string> } = {}, path = ""): FlatField[] {
  if (value === null || typeof value !== "object" || value instanceof Uint8Array) {
    const label = options.customPrefix?.[path] ?? [options.prefix, path].filter(Boolean).join(".");
    return [{ path, label: sanitizeDisplayText(label), value }];
  }
  const out: FlatField[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new TypeError("unsafe struct key");
    out.push(...flattenStruct(child, options, path ? `${path}.${key}` : key));
  }
  return out;
}
