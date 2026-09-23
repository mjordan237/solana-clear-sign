export function formatDuration(value: bigint | number | string): string {
  const seconds = BigInt(value);
  if (seconds < 0n) throw new RangeError("duration cannot be negative");
  const hours = seconds / 3600n;
  const minutes = (seconds % 3600n) / 60n;
  const remainder = seconds % 60n;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}
