import { it } from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { decodeInstruction } from "../src/index.js";

const idl = { name: "bench", instructions: [{ name: "transfer", discriminator: [1], accounts: [{ name: "to" }], args: [{ name: "amount", type: "u64", display: { formatter: { kind: "amount", decimals: 6, token: "USDC" } } }], display: { mode: "interpolated", template: "Transfer {amount} to {to}" } }] };
const data = Buffer.from("0140420f0000000000", "hex");

it("decodes in under 1ms per instruction on average", () => {
  for (let i = 0; i < 100; i++) decodeInstruction(idl, "transfer", data, ["Recipient111"]);
  const iterations = 2_000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) decodeInstruction(idl, "transfer", data, ["Recipient111"]);
  const averageMs = (performance.now() - start) / iterations;
  assert.ok(averageMs < 1, `average decode latency ${averageMs}ms exceeded 1ms`);
});
