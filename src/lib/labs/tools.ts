import { z } from "zod";

import toolboxJson from "@/cases/_shared/toolbox.json";

/**
 * The toolbox — one Arabic manual for every tool the platform simulates.
 *
 * Shared by every case rather than repeated inside them. A manifest picks the
 * tools it installs by name in `tools`; what each one *is* is answered here,
 * once. That split is the point: a case author decides which tools exist and
 * what they do in that story, and never rewrites the explanation of nmap.
 *
 * This is also where a tool's failure text lives. Those strings are fixed per
 * tool and must never vary with how close the player is to the answer — a
 * negative that changes shape is a hint, and hints belong in the Guide.
 */

const toolOptionSchema = z.object({
  /** Written as the real flag, e.g. `-sV` or `--wordlist=FILE`. */
  flag: z.string(),
  note: z.string(),
});

const toolExampleSchema = z.object({
  code: z.string(),
  note: z.string().optional(),
});

const toolErrorsSchema = z
  .object({
    /** Run bare, with no operand at all — the tool's own usage complaint. */
    noTarget: z.string().default("{cmd}: missing operand"),
    /**
     * Run against something this case doesn't script. Reads as the tool
     * failing to reach its target, never as "wrong answer".
     */
    noMatch: z.string().default("{cmd}: {arg}: no route to host"),
  })
  // `prefault`, not `default` — see the note in schema.ts; a bare `.default({})`
  // in Zod 4 returns the empty object without applying the field defaults.
  .prefault({});

const toolDocSchema = z.object({
  /** Arabic grouping shown by `help`: استطلاع، كسر التجزئة، تصعيد صلاحيات… */
  category: z.string(),
  /** One line. This is what `help` prints beside the name. */
  summary: z.string(),
  /** The teaching paragraph — why the tool exists and what it really does. */
  description: z.string(),
  usage: z.string(),
  options: z.array(toolOptionSchema).default([]),
  examples: z.array(toolExampleSchema).default([]),
  errors: toolErrorsSchema,
});

export type ToolDoc = z.infer<typeof toolDocSchema>;

const toolboxSchema = z.record(z.string(), toolDocSchema);

/**
 * Parsed at module load, so a malformed toolbox fails immediately and loudly
 * rather than as a missing man page halfway through a case.
 */
export const TOOLBOX: Record<string, ToolDoc> = toolboxSchema.parse(toolboxJson);

/**
 * Commands the engine implements itself. They exist on every host in every
 * case — no manifest installs them — so they carry their own one-line Arabic
 * summaries here rather than in the toolbox.
 */
export const BUILTIN_COMMANDS: { name: string; summary: string }[] = [
  { name: "ls", summary: "اعرض ما في المجلد الحالي." },
  { name: "cd", summary: "انتقل إلى مجلد آخر." },
  { name: "pwd", summary: "اطبع مسار المجلد الحالي." },
  { name: "cat", summary: "اطبع محتوى ملف." },
  { name: "whoami", summary: "من أنت على هذا الجهاز." },
  { name: "id", summary: "معرّفك ومجموعاتك." },
  { name: "wget", summary: "نزّل ملفًا من عنوان." },
  { name: "curl", summary: "اطلب عنوانًا واطبع الاستجابة." },
  { name: "man", summary: "افتح دليل أداة." },
  { name: "help", summary: "اعرض هذه القائمة." },
  { name: "clear", summary: "امسح الشاشة." },
  { name: "exit", summary: "أنهِ الجلسة." },
];

export const BUILTIN_NAMES: string[] = BUILTIN_COMMANDS.map((entry) => entry.name);

export function isBuiltin(name: string): boolean {
  return BUILTIN_NAMES.includes(name);
}

/** The manual for a tool, or `null` when the platform doesn't simulate it. */
export function toolDoc(name: string): ToolDoc | null {
  return TOOLBOX[name] ?? null;
}

function pad(value: string, width: number): string {
  return value.length >= width ? `${value} ` : value.padEnd(width);
}

/**
 * Renders a manual page.
 *
 * Section headers stay Latin and upper-case the way `man` prints them — they
 * double as left-to-right anchors in a page whose prose is Arabic. Latin lines
 * are indented; Arabic paragraphs sit at the margin, because an indent on a
 * right-to-left line lands on the far side and reads as a mistake.
 */
export function manPage(name: string, doc: ToolDoc): string {
  const out: string[] = [];

  out.push("NAME", `    ${name} — ${doc.summary}`, "");
  out.push("DESCRIPTION", doc.description, "");
  out.push("USAGE", `    ${doc.usage}`);

  if (doc.options.length > 0) {
    const width = Math.max(...doc.options.map((option) => option.flag.length));
    out.push("", "OPTIONS");
    for (const option of doc.options) {
      out.push(`    ${pad(option.flag, width + 4)}${option.note}`);
    }
  }

  if (doc.examples.length > 0) {
    out.push("", "EXAMPLES");
    for (const example of doc.examples) {
      out.push(`    ${example.code}`);
      if (example.note) out.push(example.note);
    }
  }

  return out.join("\n");
}

/** The short form printed for `<tool> --help`. */
export function usagePage(name: string, doc: ToolDoc): string {
  const out = [`Usage: ${doc.usage}`, "", doc.summary];

  if (doc.options.length > 0) {
    const width = Math.max(...doc.options.map((option) => option.flag.length));
    out.push("", "Options:");
    for (const option of doc.options) {
      out.push(`  ${pad(option.flag, width + 4)}${option.note}`);
    }
  }

  out.push("", `اكتب man ${name} للدليل الكامل.`);
  return out.join("\n");
}
