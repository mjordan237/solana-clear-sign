import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeVerifiedInstruction, idlSha256 } from "../src/index.js";

const idl = { name: "trusted", instructions: [{ name: "x", accounts: [], args: [{ name: "n", type: "u8" }], display: { mode: "fallback" } }] };

describe("IDL provenance", () => {
  const systemProgram = "11111111111111111111111111111111";

  it("accepts an authenticated digest bound to the observed program", () => {
    const result = decodeVerifiedInstruction(idl, { source: "embedded", expectedProgramId: systemProgram, expectedSha256: idlSha256(idl) }, systemProgram, "x", Uint8Array.of(7), []);
    assert.equal(result.mode, "fallback");
  });
  it("fails closed when the digest differs", () => {
    const result = decodeVerifiedInstruction(idl, { source: "signed-registry", expectedProgramId: systemProgram, expectedSha256: "00".repeat(32) }, systemProgram, "x", Uint8Array.of(7), []);
    assert.equal(result.mode, "raw_dump");
  });
  it("fails closed when the observed program differs from provenance", () => {
    const result = decodeVerifiedInstruction(
      idl,
      { source: "on-chain", expectedProgramId: systemProgram, expectedSha256: idlSha256(idl) },
      "Vote111111111111111111111111111111111111111",
      "x",
      Uint8Array.of(7),
      []
    );
    assert.equal(result.mode, "raw_dump");
    assert.match(result.error, /program ID/);
  });
});
