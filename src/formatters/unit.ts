import { decimalScale } from "./common.js";

export function formatUnit(value: bigint | number | string, options: { decimals?: number; symbol?: string }): string {
  return `${decimalScale(BigInt(value), options.decimals ?? 0)}${options.symbol ?? ""}`;
}
