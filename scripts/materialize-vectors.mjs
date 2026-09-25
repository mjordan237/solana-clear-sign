import { readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL("../test/vectors/adversarial.json", import.meta.url);
const outputUrl = new URL("../test/vectors/adversarial.materialized.json", import.meta.url);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));

const baseIdl = () => ({
  name: "adversarial",
  instructions: [{
    name: "pay",
    discriminator: [1],
    accounts: [{ name: "recipient" }],
    args: [{
      name: "amount",
      type: "u64",
      display: { formatter: { kind: "amount", token: "USDC", decimals: 6 } }
    }],
    display: { mode: "interpolated", template: "Pay {amount} to {recipient}" }
  }]
});

function materialize(vector) {
  const idl = baseIdl();
  let data = "0140420f0000000000";
  let accounts = ["Recipient111"];
  const instruction = idl.instructions[0];
  const field = instruction.args[0];

  if (vector.mutation === "formatter") field.display.formatter = vector.value;
  if (vector.mutation === "token") field.display.formatter.token = vector.value;
  if (vector.mutation === "template") instruction.display.template = vector.value;
  if (vector.mutation === "data" || vector.mutation === "discriminator") data = vector.value;
  if (vector.mutation === "accounts") accounts = vector.value;
  if (vector.mutation === "bool") {
    field.type = "bool";
    field.display = {};
    data = `01${vector.value}`;
  }
  if (vector.mutation === "bytes") {
    field.type = "bytes";
    field.display = { formatter: { kind: "string" } };
    data = `01${vector.value}`;
  }
  if (vector.mutation === "utf8") {
    field.type = "string";
    field.display = {};
    data = `0101000000${vector.value}`;
  }
  if (vector.mutation === "negative") {
    field.type = "i64";
    data = `01${vector.value}`;
  }
  if (vector.mutation === "slice") {
    field.type = "bytes";
    field.display = { formatter: { kind: "string", slice: vector.value } };
    data = "0103000000616263";
  }

  return {
    name: vector.name,
    instructionName: "pay",
    idl,
    data,
    accounts,
    expected: { mode: vector.expected }
  };
}

const rendered = `${JSON.stringify(source.map(materialize), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputUrl, "utf8");
  if (current !== rendered) throw new Error("materialized adversarial vectors are stale; run npm run vectors:materialize");
  console.log(`verified ${source.length} materialized adversarial vectors`);
} else {
  await writeFile(outputUrl, rendered);
  console.log(`wrote ${source.length} materialized adversarial vectors`);
}
