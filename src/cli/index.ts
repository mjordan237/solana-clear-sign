#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { extendedIdlSchema } from "../types/srfc39.js";

function usage(): never {
  console.error("Usage: solana-clear-sign-lint --idl path/to/idl.json");
  process.exit(1);
}

async function main(): Promise<void> {
  const index = process.argv.indexOf("--idl");
  const path = index >= 0 ? process.argv[index + 1] : undefined;
  if (!path) usage();
  try {
    const source = await readFile(path, "utf8");
    const json: unknown = JSON.parse(source);
    const result = extendedIdlSchema.safeParse(json);
    if (!result.success) {
      for (const issue of result.error.issues) console.error(`${issue.path.join(".") || "idl"}: ${issue.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`${path}: valid sRFC 39 IDL (${result.data.instructions.length} instruction(s))`);
  } catch (error) {
    console.error(`${path}: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}

void main();
