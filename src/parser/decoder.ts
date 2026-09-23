import { extendedIdlSchema, type ExtendedIdl, type Formatter, type IdlField, type IdlType, type PublicKeyString } from "../types/srfc39.js";
import { renderInstruction } from "../renderer/index.js";

const MAX_DYNAMIC_LENGTH = 1_048_576;

export interface ClearSignResult {
  mode: "interpolated" | "fallback";
  instruction: string;
  display: string;
  fields: Record<string, unknown>;
}

export interface RawDumpResult {
  mode: "raw_dump";
  instruction: string;
  display: string;
  raw: string;
  error: string;
}

export type DecodeResult = ClearSignResult | RawDumpResult;

class Cursor {
  offset = 0;
  constructor(readonly data: Uint8Array) {}
  take(count: number): Uint8Array {
    if (!Number.isSafeInteger(count) || count < 0 || this.offset + count > this.data.length) throw new RangeError("instruction buffer is truncated or length is invalid");
    const value = this.data.slice(this.offset, this.offset + count);
    this.offset += count;
    return value;
  }
  integer(bytes: number, signed: boolean): bigint {
    const input = this.take(bytes);
    let value = 0n;
    for (let i = 0; i < input.length; i++) value |= BigInt(input[i]!) << BigInt(i * 8);
    if (signed && (value & (1n << BigInt(bytes * 8 - 1)))) value -= 1n << BigInt(bytes * 8);
    return value;
  }
  length(): number {
    const length = Number(this.integer(4, false));
    if (length > MAX_DYNAMIC_LENGTH) throw new RangeError("dynamic value exceeds safety limit");
    return length;
  }
}

function decodeType(type: IdlType, cursor: Cursor, types: Map<string, IdlField[]>): unknown {
  if (type === "bool") { const value = cursor.integer(1, false); if (value > 1n) throw new TypeError("invalid boolean encoding"); return value === 1n; }
  if (type === "u8" || type === "i8") return cursor.integer(1, type === "i8");
  if (type === "u16" || type === "i16") return cursor.integer(2, type === "i16");
  if (type === "u32" || type === "i32") return cursor.integer(4, type === "i32");
  if (type === "u64" || type === "i64") return cursor.integer(8, type === "i64");
  if (type === "publicKey") return base58(cursor.take(32));
  if (type === "bytes") return cursor.take(cursor.length());
  if (type === "string") return new TextDecoder("utf-8", { fatal: true }).decode(cursor.take(cursor.length()));
  if ("array" in type) return Array.from({ length: type.array[1] }, () => decodeType(type.array[0], cursor, types));
  if ("vec" in type) return Array.from({ length: cursor.length() }, () => decodeType(type.vec, cursor, types));
  if ("option" in type) { const tag = cursor.integer(1, false); if (tag > 1n) throw new TypeError("invalid option tag"); return tag === 0n ? null : decodeType(type.option, cursor, types); }
  const fields = types.get(type.defined);
  if (!fields) throw new TypeError(`unresolved defined type: ${type.defined}`);
  return decodeFields(fields, cursor, types);
}

function decodeFields(fields: IdlField[], cursor: Cursor, types: Map<string, IdlField[]>): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field.name, decodeType(field.type, cursor, types)]));
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58(bytes: Uint8Array): string {
  let number = 0n;
  for (const byte of bytes) number = number * 256n + BigInt(byte);
  let output = "";
  while (number) { output = B58[Number(number % 58n)] + output; number /= 58n; }
  for (const byte of bytes) { if (byte !== 0) break; output = `1${output}`; }
  return output;
}

export function decodeInstruction(
  idlInput: ExtendedIdl | unknown,
  instructionName: string,
  instructionData: Uint8Array,
  accounts: PublicKeyString[]
): DecodeResult {
  const raw = Buffer.from(instructionData).toString("hex");
  try {
    const idl = extendedIdlSchema.parse(idlInput);
    const instruction = idl.instructions.find((candidate) => candidate.name === instructionName);
    if (!instruction) throw new TypeError("instruction is absent from IDL");
    if (accounts.length !== instruction.accounts.length) throw new RangeError("account count does not match IDL");
    const cursor = new Cursor(instructionData);
    if (instruction.discriminator) {
      const actual = cursor.take(instruction.discriminator.length);
      if (!actual.every((value, index) => value === instruction.discriminator![index])) throw new TypeError("instruction discriminator mismatch");
    }
    const types = new Map((idl.types ?? []).map((definition) => [definition.name, definition.type.fields]));
    const args = decodeFields(instruction.args, cursor, types);
    if (cursor.offset !== instructionData.length) throw new RangeError("instruction buffer has trailing bytes");
    const accountValues = Object.fromEntries(instruction.accounts.map((account, index) => [account.name, accounts[index]!])) as Record<string, unknown>;
    return renderInstruction(instruction, { ...args, ...accountValues }, types);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown parser error";
    return { mode: "raw_dump", instruction: instructionName, display: `Raw instruction data: ${raw || "(empty)"}`, raw, error: reason };
  }
}

export const decode = decodeInstruction;
