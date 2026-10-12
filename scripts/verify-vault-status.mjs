import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { vaultState } from "./vault-state.mjs";

const vaultRoot = process.env.PORTFOLIO_VAULT;
if (!vaultRoot) {
  console.log("[SKIP] PORTFOLIO_VAULT is not set; vault status not checked");
  process.exit(0);
}

const sourcePath = new URL("../src/data/destinations.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { destinations } = await import(moduleUrl);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && entry.name.endsWith(".md")) yield full;
  }
}

function frontmatterOf(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) return null;
  const pairs = {};
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    pairs[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return pairs;
}

const errors = [];
const notesBySlug = new Map();
for await (const file of walk(vaultRoot)) {
  const pairs = frontmatterOf(await readFile(file, "utf8"));
  if (!pairs?.site) continue;
  const note = { name: path.relative(vaultRoot, file), pairs };
  notesBySlug.set(pairs.site, [...(notesBySlug.get(pairs.site) ?? []), note]);
}

const slugs = new Set(destinations.map((destination) => destination.slug));
for (const [slug, notes] of notesBySlug) {
  if (!slugs.has(slug)) errors.push(`site: ${slug} names no manifest slug (${notes.map((note) => note.name).join(", ")})`);
}

const untracked = [];
for (const destination of destinations.filter((entry) => entry.kind === "case-study" && entry.primary)) {
  const notes = notesBySlug.get(destination.slug) ?? [];
  if (notes.length === 0) {
    untracked.push(destination.slug);
  } else if (notes.length > 1) {
    errors.push(`${destination.slug}: ${notes.length} notes claim it (${notes.map((note) => note.name).join(", ")})`);
  } else {
    const [note] = notes;
    const state = vaultState(note.pairs);
    if (!state) {
      errors.push(`${destination.slug}: ${note.name} has no usable stage or release`);
    } else {
      console.log(`${destination.slug}: site ${destination.state}, vault ${state} (${note.name})`);
      if (state !== destination.state) errors.push(`${destination.slug}: site says ${destination.state}, vault says ${state} (${note.name})`);
    }
  }
}

if (untracked.length) console.log(`not tracked in the vault: ${untracked.join(", ")}`);

if (errors.length) {
  console.error(`[ERROR] vault status failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("[OK] site states match the vault");
