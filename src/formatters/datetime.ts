export function formatDateTime(value: bigint | number | string, ticksPerSecond = 1): string {
  if (!Number.isSafeInteger(ticksPerSecond) || ticksPerSecond <= 0) throw new RangeError("ticksPerSecond must be a positive safe integer");
  const ticks = BigInt(value);
  const milliseconds = (ticks * 1000n) / BigInt(ticksPerSecond);
  if (milliseconds > 8640000000000000n || milliseconds < -8640000000000000n) throw new RangeError("datetime is outside ECMAScript range");
  return new Date(Number(milliseconds)).toISOString().replace(/\.000Z$/, "Z");
}
