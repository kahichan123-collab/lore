// Validation and parsing for the admin content importer.
//
// JSON format:
// {
//   "classics":  [{ "slug": "...", "title_zh": "...", ... }],
//   "excerpts":  [{ "classic_slug": "...", "text_en": "...", "text_zh": "...", ... }],
//   "questions": [{ "slug": "...", "question_zh": "...", "question_en": "...", ... }]
// }
//
// CSV format: one question per row, with the header
// slug,question_zh,question_en,tags,difficulty,classic_slug,status,featured
// `tags` may be separated by | or ;. The CSV importer only adds questions to
// an existing classic/excerpt; use JSON to create new classics and excerpts.

import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only");

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s ? s : undefined));

export const ClassicInputSchema = z.object({
  slug,
  title_zh: requiredText(200),
  title_en: requiredText(200),
  author_zh: requiredText(200),
  author_en: requiredText(200),
  era_zh: optionalText(200),
  era_en: optionalText(200),
  description_zh: optionalText(3000),
  description_en: optionalText(3000),
});

export const ExcerptInputSchema = z
  .object({
    classic_slug: slug,
    text_en: optionalText(12_000),
    text_zh: optionalText(12_000),
    text_zh_is_summary: z.boolean().default(false),
    source_note: requiredText(500),
    translator: optionalText(300),
    license_note: optionalText(500),
  })
  .refine((e) => Boolean(e.text_en || e.text_zh), {
    message: "Each excerpt needs English or Chinese text",
    path: ["text_en"],
  })
  .refine((e) => /https?:\/\//.test(e.source_note), {
    message: "source_note must include a source link (https://…)",
    path: ["source_note"],
  });

export const QuestionInputSchema = z.object({
  slug,
  question_zh: requiredText(300),
  question_en: requiredText(300),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  difficulty: z.coerce.number().int().min(1).max(3).default(1),
  classic_slug: slug.nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
});

export const ImportFileSchema = z.object({
  classics: z.array(ClassicInputSchema).max(200).default([]),
  excerpts: z.array(ExcerptInputSchema).max(500).default([]),
  questions: z.array(QuestionInputSchema).max(1000).default([]),
});

export type ClassicInput = z.infer<typeof ClassicInputSchema>;
export type ExcerptInput = z.infer<typeof ExcerptInputSchema>;
export type QuestionInput = z.infer<typeof QuestionInputSchema>;

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

function zodError(error: z.ZodError): string {
  return error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "file"}: ${i.message}`).join("; ");
}

export function parseImportJson(text: string): ParseResult<z.infer<typeof ImportFileSchema>> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  const parsed = ImportFileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  if (parsed.data.classics.length + parsed.data.excerpts.length + parsed.data.questions.length === 0) {
    return { ok: false, error: "The file is empty." };
  }
  return { ok: true, data: parsed.data };
}

/** Small RFC-4180-style CSV parser: quotes, escaped quotes, CRLF and commas. */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function parseQuestionCsv(text: string): ParseResult<QuestionInput[]> {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: "The CSV needs a header row and at least one question." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const col of ["slug", "question_zh", "question_en"]) {
    if (!header.includes(col)) return { ok: false, error: `The CSV is missing the "${col}" column.` };
  }
  const value = (row: string[], name: string) => {
    const index = header.indexOf(name);
    return index === -1 ? "" : (row[index] ?? "").trim();
  };

  const questions: QuestionInput[] = [];
  for (const [i, row] of rows.slice(1).entries()) {
    const parsed = QuestionInputSchema.safeParse({
      slug: value(row, "slug"),
      question_zh: value(row, "question_zh"),
      question_en: value(row, "question_en"),
      tags: value(row, "tags") ? value(row, "tags").split(/[|;]/).map((t) => t.trim()).filter(Boolean) : [],
      difficulty: value(row, "difficulty") || 1,
      classic_slug: value(row, "classic_slug") || null,
      status: value(row, "status") || "draft",
      featured: /^(1|true|yes)$/i.test(value(row, "featured")),
    });
    if (!parsed.success) return { ok: false, error: `Row ${i + 2}: ${zodError(parsed.error)}` };
    questions.push(parsed.data);
  }
  return { ok: true, data: questions };
}
