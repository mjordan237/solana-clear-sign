export function formatRaw(value: bigint | number | string): string {
  return BigInt(value).toString();
}
