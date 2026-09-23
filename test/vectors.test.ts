import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeInstruction, extendedIdlSchema } from "../src/index.js";

interface ValidVector { name: string; idl: unknown; data: string; accounts: string[]; expected: string }
interface AdversarialVector { name: string; mutation: string; value: unknown; expected: string }

const valid = JSON.parse(readFileSync("test/vectors/valid.json", "utf8")) as ValidVector[];
const adversarial = JSON.parse(readFileSync("test/vectors/adversarial.json", "utf8")) as AdversarialVector[];

const baseIdl = () => ({
  name: "adversarial",
  instructions: [{
    name: "pay",
    discriminator: [1],
    accounts: [{ name: "recipient" }],
    args: [{ name: "amount", type: "u64", display: { formatter: { kind: "amount", token: "USDC", decimals: 6 } } }],
    display: { mode: "interpolated", template: "Pay {amount} to {recipient}" }
  }]
});

function exercise(vector: AdversarialVector): "invalid" | "raw_dump" | "other" {
  const idl: any = baseIdl();
  let data = "0140420f0000000000";
  let accounts = ["Recipient111"];
  const instruction = idl.instructions[0]!;
  const field = instruction.args[0]!;
  if (vector.mutation === "formatter") field.display.formatter = vector.value as typeof field.display.formatter;
  if (vector.mutation === "token") field.display.formatter.token = vector.value as string;
  if (vector.mutation === "template") instruction.display.template = vector.value as string;
  if (vector.mutation === "data") data = vector.value as string;
  if (vector.mutation === "discriminator") data = vector.value as string;
  if (vector.mutation === "accounts") accounts = vector.value as string[];
  if (vector.mutation === "bool") { field.type = "bool"; field.display = {}; data = `01${vector.value as string}`; }
  if (vector.mutation === "bytes") { field.type = "bytes"; field.display = { formatter: { kind: "string" } }; data = `01${vector.value as string}`; }
  if (vector.mutation === "negative") { field.type = "i64"; data = `01${vector.value as string}`; }
  if (vector.mutation === "slice") { field.type = "bytes"; field.display = { formatter: { kind: "string", slice: vector.value } }; data = "0103000000616263"; }
  const parsed = extendedIdlSchema.safeParse(idl);
  if (!parsed.success) return "invalid";
  const result = decodeInstruction(idl, "pay", Buffer.from(data, "hex"), accounts);
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
    it(`contains ${vector.name}`, () => assert.equal(exercise(vector), vector.expected));
  }
});
