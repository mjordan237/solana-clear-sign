import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decimalScale } from "../src/formatters/common.js";
import { formatAmount, formatDateTime, formatDuration, formatRaw, formatString, formatUnit, flattenStruct, sanitizeDisplayText } from "../src/index.js";

describe("formatters", () => {
  it("scales bigint amounts without floating point", () => {
    assert.equal(formatAmount(1_100_000_000n, { isNative: true }), "1.1 SOL");
    assert.match(decimalScale(1n, 255), /^0\.0+1$/);
  });
  it("rejects negative token amounts and conflicting options", () => {
    assert.throws(() => formatAmount(-1n, { decimals: 0 }), /negative/);
    assert.throws(() => formatAmount(1n, { isNative: true, decimals: 9 }), /conflicts/);
  });
  it("formats signed units exactly", () => assert.equal(formatUnit(-27315n, { decimals: 2, symbol: "C" }), "-273.15C"));
  it("formats epoch ticks", () => assert.equal(formatDateTime(1761365183123n, 1000), "2025-10-25T04:06:23.123Z"));
  it("formats duration and raw integers", () => {
    assert.equal(formatDuration(3661n), "01:01:01");
    assert.equal(formatRaw(-42n), "-42");
    assert.throws(() => formatDuration(-1n), /negative/);
  });
  it("supports all string encodings", () => {
    const bytes = Uint8Array.from([83, 79, 76]);
    assert.equal(formatString(bytes), "SOL");
    assert.equal(formatString(bytes, { encoding: "ascii" }), "SOL");
    assert.equal(formatString(bytes, { encoding: "hex" }), "534f4c");
    assert.equal(formatString(bytes, { encoding: "base64" }), "U09M");
    assert.equal(formatString(Uint8Array.of(0), { encoding: "base58" }), "1");
  });
  it("slices source and formatted values", () => {
    assert.equal(formatString(Buffer.from("SOLANA"), { slice: { kind: "BoundedSlice", start: 3, end: 6 } }), "ANA");
    assert.equal(formatString(Buffer.from("SOLANA"), { encoding: "hex", slice: { kind: "BoundedSlice", start: 0, end: 2, appliesTo: "formatted" } }), "53");
    assert.equal(formatString(Buffer.from("SOLANA"), { slice: { kind: "SizedSlice", start: 3, size: 3 } }), "ANA");
  });
  it("flattens nested structures", () => assert.deepEqual(flattenStruct({ a: { b: 2 } }, { prefix: "x" })[0], { path: "a.b", label: "x.a.b", value: 2 }));
  it("rejects spoofing controls and mixed-script labels", () => {
    assert.throws(() => sanitizeDisplayText("US\u200bDC"), /invisible/);
    assert.throws(() => sanitizeDisplayText("UЅDC"), /confusable/);
  });
});
