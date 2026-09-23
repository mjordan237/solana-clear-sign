import { z } from "zod";

const safeInteger = z.number().int().nonnegative().safe();
const pathSegment = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const fieldPathSchema = z.string().min(1).refine(
  (path) => path.split(".").every((part) => pathSegment.test(part)),
  "field paths may contain only dot-separated identifiers"
);

export const idlTypeSchema: z.ZodType<IdlType> = z.lazy(() => z.union([
  z.enum(["bool", "u8", "i8", "u16", "i16", "u32", "i32", "u64", "i64", "string", "bytes", "publicKey"]),
  z.object({ array: z.tuple([idlTypeSchema, safeInteger]) }).strict(),
  z.object({ vec: idlTypeSchema }).strict(),
  z.object({ option: idlTypeSchema }).strict(),
  z.object({ defined: z.string().min(1) }).strict()
]));

export type IdlType =
  | "bool" | "u8" | "i8" | "u16" | "i16" | "u32" | "i32" | "u64" | "i64"
  | "string" | "bytes" | "publicKey"
  | { array: [IdlType, number] } | { vec: IdlType } | { option: IdlType } | { defined: string };

const boundedSliceSchema = z.object({
  kind: z.literal("BoundedSlice"),
  start: safeInteger.optional(),
  end: safeInteger.optional(),
  appliesTo: z.enum(["source", "formatted"]).optional(),
  reversed: z.boolean().optional()
}).strict().superRefine((value, ctx) => {
  if (value.start !== undefined && value.end !== undefined && value.end < value.start) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "slice end must be >= start" });
  }
});

const sizedSliceSchema = z.object({
  kind: z.literal("SizedSlice"),
  start: safeInteger.optional(),
  size: safeInteger,
  appliesTo: z.enum(["source", "formatted"]).optional(),
  reversed: z.boolean().optional()
}).strict();

const sliceSchema = z.union([boundedSliceSchema, sizedSliceSchema]);

const amountFormatterSchema = z.object({
  kind: z.literal("amount"),
  token: z.string().min(1).optional(),
  decimals: z.number().int().min(0).max(255).optional(),
  isNative: z.boolean().optional()
}).strict();

const formatterSchema = z.union([
  amountFormatterSchema,
  z.object({ kind: z.literal("unit"), symbol: z.string().optional(), decimals: z.number().int().min(0).max(255).optional() }).strict(),
  z.object({ kind: z.literal("string"), encoding: z.enum(["ascii", "utf8", "base58", "base64", "hex"]).optional(), slice: sliceSchema.optional() }).strict(),
  z.object({ kind: z.literal("datetime"), ticksPerSecond: z.number().int().positive().safe().optional() }).strict(),
  z.object({ kind: z.literal("duration") }).strict(),
  z.object({ kind: z.literal("raw") }).strict(),
  z.object({ kind: z.literal("enumVariant"), variantLabel: z.string().optional(), skipInnerData: z.boolean().optional() }).strict(),
  z.object({ kind: z.literal("flatStruct"), prefix: z.string().optional(), customPrefix: z.record(z.string()).optional() }).strict()
]).superRefine((value, ctx) => {
  if (value.kind !== "amount") return;
  if (value.isNative && (value.token !== undefined || value.decimals !== undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "isNative MUST NOT be combined with token or decimals" });
  }
  if (!value.isNative && value.token === undefined && value.decimals === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "amount requires token, decimals, or isNative" });
  }
});

export type Formatter = z.infer<typeof formatterSchema>;

const fieldSchema = z.object({
  name: z.string().regex(pathSegment),
  type: idlTypeSchema,
  display: z.object({ label: z.string().optional(), formatter: formatterSchema.optional(), skip: z.union([z.boolean(), z.enum(["always", "never", "withAdditionalMetadata"])]).optional() }).strict().optional()
}).strict();

const definedTypeSchema = z.object({
  name: z.string().min(1),
  type: z.object({ kind: z.literal("struct"), fields: z.array(fieldSchema) }).strict()
}).strict();

const displaySchema = z.object({
  mode: z.enum(["interpolated", "fallback"]),
  template: z.string().optional(),
  fields: z.array(fieldPathSchema).optional()
}).strict().superRefine((value, ctx) => {
  if (value.mode === "interpolated" && !value.template) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "interpolated display requires a template" });
  }
});

const instructionSchema = z.object({
  name: z.string().min(1),
  discriminator: z.array(z.number().int().min(0).max(255)).max(32).optional(),
  accounts: z.array(z.object({ name: z.string().regex(pathSegment) }).strict()).default([]),
  args: z.array(fieldSchema),
  display: displaySchema.optional()
}).strict();

export const extendedIdlSchema = z.object({
  version: z.string().optional(),
  name: z.string().min(1),
  instructions: z.array(instructionSchema).min(1),
  types: z.array(definedTypeSchema).optional()
}).strict().superRefine((idl, ctx) => {
  for (const [index, instruction] of idl.instructions.entries()) {
    if (!instruction.display) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["instructions", index, "display"], message: "missing display metadata" });
    }
    if (instruction.display?.template) {
      const opens = [...instruction.display.template.matchAll(/\{/g)].length;
      const closes = [...instruction.display.template.matchAll(/\}/g)].length;
      if (opens !== closes) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["instructions", index, "display", "template"], message: "unbalanced template braces" });
      for (const match of instruction.display.template.matchAll(/\{([^{}]+)\}/g)) {
        if (!fieldPathSchema.safeParse(match[1]).success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["instructions", index, "display", "template"], message: `dangerous interpolation key: ${match[1]}` });
      }
    }
  }
});

export type ExtendedIdl = z.infer<typeof extendedIdlSchema>;
export type IdlField = z.infer<typeof fieldSchema>;
export type IdlInstruction = z.infer<typeof instructionSchema>;
export type PublicKeyString = string;

export function validateExtendedIdl(input: unknown): ExtendedIdl {
  return extendedIdlSchema.parse(input);
}
