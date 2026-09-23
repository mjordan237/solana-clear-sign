import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extendedIdlSchema } from "../src/index.js";

describe("strict IDL schema", () => {
  it("rejects unknown keys", () => assert.equal(extendedIdlSchema.safeParse({ name: "x", evil: true, instructions: [] }).success, false));
  it("rejects missing display metadata", () => assert.equal(extendedIdlSchema.safeParse({ name: "x", instructions: [{ name: "x", args: [], accounts: [] }] }).success, false));
  it("rejects dangerous field selectors", () => assert.equal(extendedIdlSchema.safeParse({ name: "x", instructions: [{ name: "x", args: [], accounts: [], display: { mode: "fallback", fields: ["../x"] } }] }).success, false));
});
