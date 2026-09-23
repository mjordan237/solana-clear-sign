import { createHash, timingSafeEqual } from "node:crypto";
import type { DecodeResult } from "./parser/decoder.js";
import { decodeInstruction } from "./parser/decoder.js";
import type { PublicKeyString } from "./types/srfc39.js";

export interface IdlProvenance {
  source: "on-chain" | "embedded" | "signed-registry";
  expectedSha256: string;
  expectedProgramId: PublicKeyString;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

export function idlSha256(idl: unknown): string {
  return createHash("sha256").update(canonical(idl)).digest("hex");
}

export function decodeVerifiedInstruction(
  idl: unknown,
  provenance: IdlProvenance,
  observedProgramId: PublicKeyString,
  instructionName: string,
  instructionData: Uint8Array,
  accounts: PublicKeyString[]
): DecodeResult {
  const raw = Buffer.from(instructionData).toString("hex");
  if (observedProgramId !== provenance.expectedProgramId) {
    return { mode: "raw_dump", instruction: instructionName, display: `Raw instruction data: ${raw || "(empty)"}`, raw, error: "program ID does not match authenticated provenance" };
  }
  const actual = Buffer.from(idlSha256(idl), "hex");
  const expected = Buffer.from(provenance.expectedSha256, "hex");
  if (expected.length !== 32 || !timingSafeEqual(actual, expected)) {
    return { mode: "raw_dump", instruction: instructionName, display: `Raw instruction data: ${raw || "(empty)"}`, raw, error: "IDL provenance digest mismatch" };
  }
  return decodeInstruction(idl, instructionName, instructionData, accounts);
}
