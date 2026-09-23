import type { Formatter, IdlField, IdlInstruction } from "../types/srfc39.js";
import { formatAmount } from "../formatters/amount.js";
import { formatDateTime } from "../formatters/datetime.js";
import { formatString } from "../formatters/string.js";
import { flattenStruct } from "../formatters/struct.js";
import { formatUnit } from "../formatters/unit.js";
import { formatDuration } from "../formatters/duration.js";
import { formatRaw } from "../formatters/raw.js";
import { safePath, sanitizeDisplayText } from "../security.js";
import type { ClearSignResult } from "../parser/decoder.js";

function getPath(root: Record<string, unknown>, path: string): unknown {
  let value: unknown = root;
  for (const key of safePath(path)) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) throw new TypeError(`unresolved interpolation key: ${path}`);
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function scalar(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  if (typeof value === "string") return sanitizeDisplayText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "none";
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
}

function formatted(value: unknown, formatter?: Formatter): string {
  if (!formatter) return scalar(value);
  if (formatter.kind === "amount") return sanitizeDisplayText(formatAmount(value as bigint, formatter));
  if (formatter.kind === "unit") return sanitizeDisplayText(formatUnit(value as bigint, formatter));
  if (formatter.kind === "datetime") return formatDateTime(value as bigint, formatter.ticksPerSecond);
  if (formatter.kind === "duration") return formatDuration(value as bigint);
  if (formatter.kind === "raw") return formatRaw(value as bigint);
  if (formatter.kind === "enumVariant") {
    if (value === null || typeof value !== "object" || !("variant" in value)) throw new TypeError("enumVariant requires a decoded enum value");
    const variant = formatter.variantLabel ?? String((value as { variant: unknown }).variant);
    if (formatter.skipInnerData || !("value" in value)) return sanitizeDisplayText(variant);
    return `${sanitizeDisplayText(variant)}: ${scalar((value as { value: unknown }).value)}`;
  }
  if (formatter.kind === "string") {
    const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value as Array<number | bigint>, (item) => Number(item));
    return formatString(bytes, formatter);
  }
  return flattenStruct(value, formatter).map((field) => `${field.label}: ${scalar(field.value)}`).join(", ");
}

function fieldAtPath(path: string, instruction: IdlInstruction, types: Map<string, IdlField[]>): IdlField | undefined {
  const parts = safePath(path);
  let fields = instruction.args;
  let found: IdlField | undefined;
  for (const part of parts) {
    found = fields.find((field) => field.name === part);
    if (!found) return undefined;
    fields = typeof found.type === "object" && "defined" in found.type ? (types.get(found.type.defined) ?? []) : [];
  }
  return found;
}

export function renderInstruction(instruction: IdlInstruction, values: Record<string, unknown>, types: Map<string, IdlField[]>): ClearSignResult {
  if (!instruction.display) throw new TypeError("display metadata is missing");
  const availablePaths = instruction.display.fields ?? [
    ...instruction.args.filter((field) => field.display?.skip !== true && field.display?.skip !== "always").map((field) => field.name),
    ...instruction.accounts.map((account) => account.name)
  ];
  const displayValues: Record<string, string> = {};
  for (const path of availablePaths) {
    const value = getPath(values, path);
    displayValues[path] = formatted(value, fieldAtPath(path, instruction, types)?.display?.formatter);
  }
  if (instruction.display.mode === "interpolated") {
    const template = sanitizeDisplayText(instruction.display.template!);
    const display = template.replace(/\{([^{}]+)\}/g, (_, path: string) => {
      if (!Object.hasOwn(displayValues, path)) {
        const value = getPath(values, path);
        return formatted(value, fieldAtPath(path, instruction, types)?.display?.formatter);
      }
      return displayValues[path]!;
    });
    if (/[{}]/.test(display)) throw new TypeError("malformed interpolation template");
    return { mode: "interpolated", instruction: instruction.name, display: sanitizeDisplayText(display), fields: values };
  }
  const display = availablePaths.map((path) => {
    const field = fieldAtPath(path, instruction, types);
    const label = sanitizeDisplayText(field?.display?.label ?? path);
    return `${label}: ${displayValues[path]}`;
  }).join("\n");
  return { mode: "fallback", instruction: instruction.name, display, fields: values };
}
