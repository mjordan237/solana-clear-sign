import { decimalScale } from "./common.js";

export interface AmountOptions { token?: string; decimals?: number; isNative?: boolean }

export function formatAmount(value: bigint | number | string, options: AmountOptions): string {
  const amount = BigInt(value);
  if (amount < 0n) throw new RangeError("token amounts cannot be negative");
  if (options.isNative && (options.decimals !== undefined || options.token !== undefined)) throw new TypeError("isNative conflicts with token/decimals");
  const decimals = options.isNative ? 9 : options.decimals;
  if (decimals === undefined) throw new TypeError("amount decimals are unresolved");
  const token = options.isNative ? "SOL" : options.token;
  const rendered = decimalScale(amount, decimals);
  return token ? `${rendered} ${token}` : rendered;
}
