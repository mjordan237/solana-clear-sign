import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extendedIdlSchema } from "../src/index.js";

describe("strict IDL schema", () => {
  it("rejects unknown keys", () => assert.equal(extendedIdlSchema.safeParse({ name: "x", evil: true, instructions: [] }).success, false));
  it("rejects missing display metadata", () => assert.equal(extendedIdlSchema.safeParse({ name: "x", instructions: [{ name: "x", args: [], accounts: [] }] }).success, false));
  it("rejects dangerous field selectors", () => assert.equal(extendedIdlSchema.safeParse({ name: "x", instructions: [{ name: "x", args: [], accounts: [], display: { mode: "fallback", fields: ["../x"] } }] }).success, false));
  it("rejects duplicate argument names", () => assert.equal(extendedIdlSchema.safeParse({
    name: "x",
    instructions: [{
      name: "transfer",
      accounts: [],
      args: [{ name: "amount", type: "u8" }, { name: "amount", type: "u8" }],
      display: { mode: "fallback" }
    }]
  }).success, false));
  it("rejects account names that conflict with arguments", () => assert.equal(extendedIdlSchema.safeParse({
    name: "x",
    instructions: [{
      name: "transfer",
      accounts: [{ name: "recipient" }],
      args: [{ name: "recipient", type: "publicKey" }],
      display: { mode: "fallback" }
    }]
  }).success, false));
  it("rejects duplicate instruction, type, and struct-field names", () => assert.equal(extendedIdlSchema.safeParse({
    name: "x",
    instructions: [
      { name: "same", accounts: [], args: [], display: { mode: "fallback" } },
      { name: "same", accounts: [], args: [], display: { mode: "fallback" } }
    ],
    types: [
      { name: "record", type: { kind: "struct", fields: [{ name: "value", type: "u8" }, { name: "value", type: "u8" }] } },
      { name: "record", type: { kind: "struct", fields: [] } }
    ]
  }).success, false));
});
