export function decimalScale(value: bigint, decimals: number): string {
  if (decimals < 0 || !Number.isSafeInteger(decimals) || decimals > 255) throw new RangeError("invalid decimal precision");
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  if (decimals === 0) return `${negative ? "-" : ""}${digits}`;
  const padded = digits.padStart(decimals + 1, "0");
  const integer = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}
