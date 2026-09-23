import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeInstruction } from "../src/index.js";

const idl = {
  name: "types",
  instructions: [{
    name: "decode",
    accounts: [],
    args: [
      { name: "count", type: "u16" },
      { name: "maybe", type: { option: "u8" } },
      { name: "items", type: { vec: "i8" } }
    ],
    display: { mode: "fallback" }
  }]
};

describe("defensive decoder", () => {
  it("decodes arrays, options, and signed values", () => {
    const result = decodeInstruction(idl, "decode", Buffer.from("2a00010203000000ff007f", "hex"), []);
    assert.equal(result.mode, "fallback");
    assert.deepEqual(result.fields, { count: 42n, maybe: 2n, items: [-1n, 0n, 127n] });
  });
  it("always falls back instead of throwing", () => {
    assert.doesNotThrow(() => decodeInstruction({}, "missing", new Uint8Array(), []));
    assert.equal(decodeInstruction({}, "missing", new Uint8Array(), []).mode, "raw_dump");
  });
  it("rejects trailing bytes", () => assert.equal(decodeInstruction(idl, "decode", Buffer.from("0000000000000000", "hex"), []).mode, "raw_dump"));
});
