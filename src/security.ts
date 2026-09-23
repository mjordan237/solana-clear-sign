const INVISIBLE_OR_BIDI = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/u;
const MIXED_SCRIPT = /(?=.*\p{Script=Latin})(?=.*(?:\p{Script=Cyrillic}|\p{Script=Greek}))/u;

export class UnsafeDisplayError extends Error {}

export function sanitizeDisplayText(value: string): string {
  const normalized = value.normalize("NFKC");
  if (INVISIBLE_OR_BIDI.test(normalized)) throw new UnsafeDisplayError("display text contains invisible or bidirectional control characters");
  if (MIXED_SCRIPT.test(normalized)) throw new UnsafeDisplayError("display text mixes confusable scripts");
  if (/\p{Cc}/u.test(normalized)) throw new UnsafeDisplayError("display text contains control characters");
  return normalized;
}

export function safePath(path: string): string[] {
  const parsed = fieldPathSchemaForRuntime(path);
  if (!parsed) throw new UnsafeDisplayError(`unsafe field path: ${path}`);
  return path.split(".");
}

function fieldPathSchemaForRuntime(path: string): boolean {
  return path.length > 0 && path.split(".").every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) && !path.includes("__proto__") && !path.includes("constructor") && !path.includes("prototype");
}
