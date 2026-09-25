import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const pin = JSON.parse(await readFile(new URL("../spec/srfc39-pin.json", import.meta.url), "utf8"));
const response = await fetch(pin.apiUrl, {
  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "solana-clear-sign-spec-pin"
  }
});

if (!response.ok) throw new Error(`unable to fetch pinned sRFC source: HTTP ${response.status}`);

const discussion = await response.json();
const digest = createHash("sha256").update(`${discussion.body}\n`, "utf8").digest("hex");
const mismatches = [];

if (discussion.number !== pin.discussionNumber) mismatches.push(`discussion number ${discussion.number}`);
if (discussion.title !== "DRAFT: sRFC 39: Solana Clear Sign") mismatches.push(`title ${discussion.title}`);
if (discussion.updated_at !== pin.sourceUpdatedAt) mismatches.push(`updated_at ${discussion.updated_at}`);
if (digest !== pin.bodySha256WithTrailingLf) mismatches.push(`body SHA-256 ${digest}`);

if (mismatches.length) {
  throw new Error(`sRFC 39 drift requires explicit review: ${mismatches.join(", ")}`);
}

console.log(`verified sRFC 39 compatibility snapshot ${digest}`);
