import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeVerifiedInstruction, idlSha256 } from "../src/index.js";

const idl = { name: "trusted", instructions: [{ name: "x", accounts: [], args: [{ name: "n", type: "u8" }], display: { mode: "fallback" } }] };

describe("IDL provenance", () => {
  it("accepts an authenticated canonical digest", () => {
    const result = decodeVerifiedInstruction(idl, { source: "embedded", programId: "Program111", expectedSha256: idlSha256(idl) }, "x", Uint8Array.of(7), []);
    assert.equal(result.mode, "fallback");
  });
  it("fails closed when the digest differs", () => {
    const result = decodeVerifiedInstruction(idl, { source: "signed-registry", programId: "Program111", expectedSha256: "00".repeat(32) }, "x", Uint8Array.of(7), []);
    assert.equal(result.mode, "raw_dump");
  });
});
