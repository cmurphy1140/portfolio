import { readFile } from "node:fs/promises";
import process from "node:process";
import ts from "typescript";

const sourcePath = new URL("../src/data/destinations.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { destinations, destinationKinds } = await import(moduleUrl);

const errors = [];
const seen = new Set();

for (const destination of destinations) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(destination.slug)) {
    errors.push(`${destination.slug}: slug must be lowercase kebab-case`);
  }
  if (seen.has(destination.slug)) errors.push(`${destination.slug}: duplicate slug`);
  seen.add(destination.slug);
  if (!destinationKinds.includes(destination.kind)) {
    errors.push(`${destination.slug}: invalid kind ${destination.kind}`);
  }
  if (destination.verified && !destination.href) {
    errors.push(`${destination.slug}: verified destination has no href`);
  }
  if (destination.href.startsWith("/") === false && !/^https:\/\//.test(destination.href)) {
    errors.push(`${destination.slug}: href must be an internal route or HTTPS URL`);
  }
  if (/^(file:|javascript:|data:)/i.test(destination.href)) {
    errors.push(`${destination.slug}: unsafe href scheme`);
  }
}

for (const destination of destinations.filter((entry) => /^https:\/\//.test(entry.href))) {
  try {
    const response = await fetch(destination.href, {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": "personal-os-destination-check" },
    });
    if (!response.ok) errors.push(`${destination.slug}: ${destination.href} returned ${response.status}`);
  } catch (error) {
    errors.push(`${destination.slug}: ${destination.href} could not be reached (${error.message})`);
  }
}

for (const destination of destinations.filter((entry) => entry.number)) {
  const { proof } = destination.number;
  try {
    const response = await fetch(proof, {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": "personal-os-destination-check" },
    });
    if (!response.ok) errors.push(`${destination.slug}: number proof ${proof} returned ${response.status}`);
  } catch (error) {
    errors.push(`${destination.slug}: number proof ${proof} could not be reached (${error.message})`);
  }
}

if (errors.length) {
  console.error(`[ERROR] destination manifest failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`[OK] verified ${destinations.length} allowlisted destinations`);
