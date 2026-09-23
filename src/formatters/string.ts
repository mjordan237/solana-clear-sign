import { sanitizeDisplayText } from "../security.js";

export type StringSlice =
  | { kind: "BoundedSlice"; start?: number; end?: number; appliesTo?: "source" | "formatted"; reversed?: boolean }
  | { kind: "SizedSlice"; start?: number; size: number; appliesTo?: "source" | "formatted"; reversed?: boolean };

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let result = "";
  while (value > 0n) { result = BASE58[Number(value % 58n)] + result; value /= 58n; }
  for (const byte of bytes) { if (byte !== 0) break; result = "1" + result; }
  return result || (bytes.length ? "1".repeat(bytes.length) : "");
}

function bounded<T extends Uint8Array | string>(value: T, slice?: StringSlice): T {
  if (!slice) return value;
  const start = slice.start ?? 0;
  const end = slice.kind === "SizedSlice" ? start + slice.size : (slice.end ?? value.length);
  if (start > end || end > value.length) throw new RangeError("slice is out of bounds");
  const result = value.slice(start, end) as T;
  return (slice.reversed ? (typeof result === "string" ? [...result].reverse().join("") : result.slice().reverse()) : result) as T;
}

export function formatString(source: Uint8Array, options: { encoding?: "ascii" | "utf8" | "base58" | "base64" | "hex"; slice?: StringSlice } = {}): string {
  const encoding = options.encoding ?? "utf8";
  const bytes = options.slice?.appliesTo === "formatted" ? source : bounded(source, options.slice);
  let formatted: string;
  if (encoding === "utf8") formatted = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  else if (encoding === "ascii") { if (bytes.some((v) => v > 0x7f)) throw new TypeError("non-ASCII byte"); formatted = String.fromCharCode(...bytes); }
  else if (encoding === "hex") formatted = Buffer.from(bytes).toString("hex");
  else if (encoding === "base64") formatted = Buffer.from(bytes).toString("base64");
  else formatted = base58(bytes);
  if (options.slice?.appliesTo === "formatted") formatted = bounded(formatted, options.slice);
  return sanitizeDisplayText(formatted);
}
