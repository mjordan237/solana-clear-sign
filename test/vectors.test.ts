import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeInstruction, extendedIdlSchema } from "../src/index.js";

interface ValidVector { name: string; idl: unknown; data: string; accounts: string[]; expected: string }
interface AdversarialVector {
  name: string;
  instructionName: string;
  idl: unknown;
  data: string;
  accounts: string[];
  expected: { mode: "invalid" | "raw_dump" };
}

const valid = JSON.parse(readFileSync("test/vectors/valid.json", "utf8")) as ValidVector[];
const adversarial = JSON.parse(readFileSync("test/vectors/adversarial.materialized.json", "utf8")) as AdversarialVector[];

function exercise(vector: AdversarialVector): "invalid" | "raw_dump" | "other" {
  const parsed = extendedIdlSchema.safeParse(vector.idl);
  if (!parsed.success) return "invalid";
  const result = decodeInstruction(vector.idl, vector.instructionName, Buffer.from(vector.data, "hex"), vector.accounts);
  return result.mode === "raw_dump" ? "raw_dump" : "other";
}

describe("JSON conformance vectors", () => {
  it("contains the required corpus size", () => {
    assert.ok(valid.length >= 10);
    assert.ok(adversarial.length >= 15);
  });
  for (const vector of valid) {
    it(`accepts ${vector.name}`, () => {
      const instructionName = (vector.idl as { instructions: { name: string }[] }).instructions[0]!.name;
      const result = decodeInstruction(vector.idl, instructionName, Buffer.from(vector.data, "hex"), vector.accounts);
      assert.notEqual(result.mode, "raw_dump", result.mode === "raw_dump" ? result.error : undefined);
      assert.equal(result.display, vector.expected);
    });
  }
  for (const vector of adversarial) {
    it(`contains ${vector.name}`, () => assert.equal(exercise(vector), vector.expected.mode));
  }
});
