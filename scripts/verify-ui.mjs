import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* Routes come from the destinations manifest, loaded the way
   verify-destinations.mjs loads it: verified internal hrefs only. */
const manifestSource = await readFile(new URL("../src/data/destinations.ts", import.meta.url), "utf8");
const manifestJs = ts.transpileModule(manifestSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { destinations } = await import(`data:text/javascript;base64,${Buffer.from(manifestJs).toString("base64")}`);
const routes = destinations.filter((entry) => entry.verified && entry.href.startsWith("/")).map((entry) => entry.href);

async function checkVeroParity() {
  const fixture = await readFile(new URL("./fixtures/highlighter-markup-page.html", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../src/components/vero-design/provenance.json", import.meta.url), "utf8"));
  const hash = createHash("sha256").update(fixture).digest("hex");
  assert.equal(hash, "6d3f3c1e06b91734a09814d10e3c310cf89c92439d5cd20dbe19bf9013c9f88e");
  assert.equal(hash, config.sha256);
  const styles = [...fixture.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join("\n");
  const cleanStyles = styles.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const rule of config.rules) {
    assert.ok(cleanStyles.includes(rule.selector + " {" + rule.declarations + "}"), `Imported rule drifted: ${rule.selector}`);
  }
  const expected = "/* Imported from pinned InstaLanding source; see provenance.json. */\n" + config.rules.map(rule => rule.scopedSelector + " {" + rule.declarations.replaceAll("url(#rough)", "url(#vero-rough)").replaceAll("url(#paper)", "url(#vero-paper)") + "}\n").join("") + "@media (max-width: 900px) { .vero-import .figures { grid-template-columns: repeat(2, 1fr); } }\n@media (max-width: 520px) { .vero-import .figures { grid-template-columns: 1fr; } }\n";
  const runtime = await readFile(new URL("../src/components/vero-design/upstream.css", import.meta.url), "utf8");
  assert.equal(runtime, expected, "Runtime imported CSS differs from pinned declaration baseline");
  for (const filter of config.filters.match(/<filter[\s\S]*?<\/filter>/g)) assert.ok(fixture.includes(filter));
  const adapter = await readFile(new URL("../src/components/vero-case-study.module.css", import.meta.url), "utf8");
  assert.doesNotMatch(adapter, /(?:^|[;{])\s*(?:opacity|filter|box-shadow|rotate|inset|height|border-radius)\s*:/, "Brand adapter changes upstream effect geometry");
  assert.match(adapter, /mark\.w\) \{ color: #100f0f;/);
  const luminance = color => {
    const channels = color.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const [name, amber, paper] of [["dark", [217,169,92], [18,18,20]], ["light", [138,92,18], [251,250,247]]]) {
    const stroke = amber.map((value, index) => value * 0.75 + paper[index] * 0.25);
    const contrast = (luminance(stroke) + 0.05) / (luminance([16,15,15]) + 0.05);
    assert.ok(contrast >= 4.5, `${name}: theoretical marker contrast ${contrast}`);
  }
  console.log(`[OK] Vero parity: ${config.rules.length} exact imported rules, pinned source hash, filters, brand-only geometry guard and both theme contrast calculations`);
}

await checkVeroParity();

/* Render the server component without launching a browser: every approved
   sentence must survive the new composition, with initially collapsed linked claim controls. */
async function checkVeroMarkup() {
  const source = await readFile(new URL("../src/components/vero-case-study.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('import "./vero-design/upstream.css";'), "Pinned design CSS is not imported at runtime");
  const componentJs = ts.transpileModule(source.replace(/import ".*?\.css";/g, "").replace(/import styles from .*?;/, 'const styles = new Proxy({}, { get: (_, key) => String(key) });'), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve("react/jsx-runtime"))).replaceAll('"next/link"', JSON.stringify(import.meta.resolve("next/link.js"))).replaceAll('"react"', JSON.stringify(import.meta.resolve("react")));
  const { default: VeroCaseStudy } = await import(`data:text/javascript;base64,${Buffer.from(componentJs).toString("base64")}`);
  const vero = destinations.find(entry => entry.slug === "vero");
  const markup = renderToStaticMarkup(createElement(VeroCaseStudy, { destination: vero }));
  const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
  for (const text of [vero.question, vero.summary, vero.status, ...vero.evidence, vero.correction, vero.learning]) {
    assert.ok(markup.includes(escape(text)), `Vero dropped approved content: ${text}`);
  }
  assert.equal((markup.match(/aria-expanded="false"/g) ?? []).length, 3);
  assert.equal((markup.match(/aria-controls="vero-note"/g) ?? []).length, 3);
  assert.match(markup, /id="vero-note"[^>]*hidden/);
  assert.match(markup, /<noscript>/);
  assert.match(markup, /id="vero-rough"/);
  const config = JSON.parse(await readFile(new URL("../src/components/vero-design/provenance.json", import.meta.url), "utf8"));
  const normalizeFilter = value => value.replace(/<([A-Za-z]+)([^>]*?)\s*\/>/g, "<$1$2></$1>").replace(/>\s+</g, "><").replace(/\s+>/g, ">");
  for (const original of config.filters.match(/<filter[\s\S]*?<\/filter>/g)) {
    const expected = normalizeFilter(original.replace('id="rough"', 'id="vero-rough"').replace('id="paper"', 'id="vero-paper"'));
    assert.ok(markup.includes(expected), "Rendered filter differs from imported SVG configuration");
  }
  assert.equal((markup.match(/class="w last"/g) ?? []).length, 3);
  const license = await readFile(new URL("../src/components/vero-case-study.LICENSE", import.meta.url), "utf8");
  const distributedLicense = await readFile(new URL("../public/licenses/instalanding-highlighter.txt", import.meta.url), "utf8");
  assert.equal(distributedLicense, license, "Public license must preserve both full MIT notices exactly");
  assert.match(markup, /<a href="\/licenses\/instalanding-highlighter\.txt">MIT licenses<\/a>/);

  for (const value of ["1.5", "0.15–0.41", "Twelve timed writes", ...vero.tags]) assert.ok(markup.includes(value));
  assert.doesNotMatch(markup, /<(?:script|video|audio|iframe)[ >]/);
  console.log("[OK] Vero server markup: 3 collapsed claim controls; all approved content and timing preserved");
}

await checkVeroMarkup();
if (process.argv.includes("--markup-only")) process.exit(0);

const axePath = fileURLToPath(new URL("../node_modules/axe-core/axe.min.js", import.meta.url));

const baseUrl = process.env.PERSONAL_OS_URL ?? "http://127.0.0.1:4174";
const browser = await chromium.launch({ headless: true });
const errors = [];


async function checkVeroInteractions(page, viewport, label) {
  const vero = destinations.find(entry => entry.slug === "vero");
  await page.goto(`${baseUrl}/work/vero`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: vero.question }).waitFor();
  const claims = page.locator("main .claim");
  const note = page.locator("#vero-note");
  assert.equal(await claims.count(), 3, `${label}: claims`);
  for (let index = 0; index < 3; index++) assert.equal(await claims.nth(index).getAttribute("aria-expanded"), "false");
  for (let index = 0; index < 3; index++) {
    const claim = claims.nth(index);
    assert.equal(await claim.getAttribute("aria-controls"), "vero-note");
    await claim.click();
    assert.equal(await claim.getAttribute("aria-expanded"), "true");
    await note.getByText(vero.evidence[index], { exact: true }).waitFor();
    assert.equal(await page.locator('main .claim[aria-expanded="true"]').count(), 1);
    await claim.press("Enter");
    assert.equal(await claim.getAttribute("aria-expanded"), "false");
    assert.equal(await note.isVisible(), false);
    await claim.press("Space");
    assert.equal(await claim.getAttribute("aria-expanded"), "true");
    assert.equal(await claim.evaluate(element => element === document.activeElement), true);
  }
  assert.equal(await page.locator("#vero-rough feTurbulence").getAttribute("baseFrequency"), ".08");
  assert.equal(await page.locator("#vero-rough feDisplacementMap").getAttribute("scale"), "5");
  if (viewport.width === 390) {
    const lines = await claims.nth(1).locator("mark.w").evaluateAll(words => new Set(words.map(word => Math.round(word.getBoundingClientRect().top))).size);
    assert.ok(lines > 1, `${label}: multi-word mark did not wrap`);
  }
  await page.getByText(vero.correction, { exact: true }).waitFor();
  await page.getByText(vero.learning, { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width, `${label}: expanded Vero overflow`);
  assert.equal(await page.locator("main video, main audio, main iframe").count(), 0);
  assert.equal(await page.locator("main").evaluate(element => element.getAnimations({ subtree: true }).length), 0, `${label}: Vero should be static`);
  await page.screenshot({ path: `/tmp/personal-os-${label}-vero.png`, fullPage: true });
  const other = destinations.find(entry => entry.slug === "itinerary-control");
  await page.goto(`${baseUrl}${other.href}`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("main details").count(), 0, `${label}: non-Vero layout changed`);
  assert.equal(await page.locator("main ul.evidence li").count(), other.evidence.length);
  for (const evidence of other.evidence) await page.getByText(evidence, { exact: true }).waitFor();
}

async function checkViewport(name, viewport) {
  const page = await browser.newPage({ viewport, colorScheme: "dark" });
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.equal(dimensions.innerWidth, viewport.width, `${name}: browser ignored viewport width`);
  assert.equal(dimensions.innerHeight, viewport.height, `${name}: browser ignored viewport height`);
  assert.equal(dimensions.scrollWidth, dimensions.innerWidth, `${name}: horizontal overflow`);
  await page.screenshot({ path: `/tmp/personal-os-${name}.png`, fullPage: true });

  /* Who Connor is comes first: one name heading, and a résumé button sized to
     its label rather than stretched across the column (D1, D2). */
  await page.getByRole("heading", { level: 1, name: "Connor Murphy" }).waitFor();
  assert.equal(await page.getByText("Personal OS", { exact: true }).count(), 0, `${name}: "Personal OS" still billed on the page`);
  const resumeButton = page.getByRole("link", { name: "Download résumé" });
  const resumeBox = await resumeButton.boundingBox();
  assert.ok(resumeBox && resumeBox.width < 260, `${name}: résumé button stretched to ${resumeBox?.width}px`);

  /* The road draws only the dated record, and links to the drawing to scale. */
  const road = page.getByRole("region", { name: "The road so far" });
  assert.equal(await road.getByRole("listitem").count(), 8, `${name}: road should show the 8 dated entries`);
  await road.getByText("B.S. Computer Science").waitFor();

  /* Project rows lead with the question; filters come from the manifest's states. */
  const work = page.getByRole("region", { name: "A few things I’m working through." });
  await work.getByRole("link", { name: "Evidence Room", exact: true }).waitFor();
  await work.getByRole("heading", { level: 3, name: "Could my grandmother's card game live on a phone, and teach someone new to play it?" }).waitFor();
  for (const [label, count] of [["Active", 4], ["Parked", 1], ["Released", 2], ["All", 7]]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    assert.equal(await work.getByRole("article").count(), count, `${name}: ${label} filter`);
  }
  assert.equal(await work.getByRole("link", { name: "CI runs on GitHub" }).count(), 2, `${name}: proof links`);
  await page.getByRole("searchbox", { name: "Search projects" }).fill("x".repeat(300));
  await page.getByText("No projects match that combination.").waitFor();
  await page.getByRole("button", { name: "Show all projects" }).click();
  assert.equal(await work.getByRole("article").count(), 7);
  await work.locator("summary").first().click();
  assert.ok(await work.locator("details").first().getAttribute("open") !== null);
  await page.getByRole("button", { name: "Explore how a claim changes" }).click();
  await page.getByRole("button", { name: "Play video", exact: true }).click();
  await page.getByRole("button", { name: "Pause video", exact: true }).waitFor();
  await page.getByRole("button", { name: "3. Revise the claim" }).click();
  await page.getByText("The cause is still uncertain.", { exact: true }).first().waitFor();
  await page.screenshot({ path: `/tmp/personal-os-${name}-motion.png`, fullPage: true });
  const catch5 = work.getByRole("article").filter({ hasText: "Catch 5" });
  await catch5.getByText("Development closed; the family plays it.", { exact: true }).waitFor();
  assert.ok(await catch5.getByRole("link", { name: "Catch 5", exact: true }).count() > 0, `${name}: verified Catch 5 is not linked`);

  /* The terminal is closed until asked for, and a tap on a card runs the same
     router as a typed command. */
  assert.equal(await page.getByLabel("Portfolio command").isVisible(), false, `${name}: terminal open on load`);
  await work.getByRole("link", { name: "Proposal Control", exact: true }).click();
  await page.waitForURL(`${baseUrl}/work/itinerary-control`);
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  if (name === "desktop") {
    await page.keyboard.press("Control+k");
  } else {
    await page.getByRole("button", { name: "Open the terminal", exact: true }).click();
  }
  await page.getByLabel("Portfolio command").waitFor();
  await page.getByLabel("Portfolio command").fill("sudo whoami");
  await page.getByLabel("Portfolio command").press("Enter");
  await page.getByText("command not found", { exact: false }).waitFor();
  await page.getByText("last exit 127", { exact: false }).waitFor();
  await page.getByLabel("Portfolio command").fill("open band-charter-outreach");
  await page.getByLabel("Portfolio command").press("Enter");
  await page.getByText("destination not verified yet", { exact: false }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByLabel("Portfolio command").waitFor({ state: "hidden" });

  if (name === "mobile") {
    await page.getByRole("button", { name: "Open the terminal", exact: true }).click();
    await page.getByLabel("Portfolio command").fill("open itinerary-control");
    await page.getByLabel("Portfolio command").press("Enter");
    await page.waitForURL(`${baseUrl}/work/itinerary-control`);

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open the terminal", exact: true }).click();
    await page.getByLabel("Portfolio command").fill("open vero");
    await page.getByLabel("Portfolio command").press("Enter");
    await page.waitForURL(`${baseUrl}/work/vero`);
  }

  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${route}: expected HTTP 200`);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.equal(width, viewport.width, `${name} ${route}: horizontal overflow`);
  }
  const resumePdf = await page.request.get(`${baseUrl}/Connor_Murphy_Resume.pdf`);
  assert.equal(resumePdf.status(), 200, "/Connor_Murphy_Resume.pdf: expected HTTP 200");
  assert.match(resumePdf.headers()["content-type"] ?? "", /application\/pdf/);
  await page.close();
  for (const scheme of ["dark", "light"]) {
    const axePage = await browser.newPage({ viewport, colorScheme: scheme });
    for (const route of ["/", ...routes]) {
      await axePage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      await axePage.addScriptTag({ path: axePath });
      const results = await axePage.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
      for (const violation of results.violations) {
        errors.push(`axe ${name} ${scheme} ${route}: ${violation.id} (${violation.impact}) ${violation.nodes.map(node => node.target.join(" ")).join(" | ")}`);
      }
    }
    await checkVeroInteractions(axePage, viewport, `${name}-${scheme}`);
    await axePage.close();
  }
  console.log(`[OK] ${name} ${viewport.width}x${viewport.height}: no overflow; interaction and routes passed`);
}

try {
  await checkViewport("mobile", { width: 390, height: 844 });
  await checkViewport("desktop", { width: 1440, height: 1000 });
  const page = await browser.newPage({ viewport: {width: 390, height: 844}, reducedMotion: "reduce", colorScheme: "light" });
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(baseUrl);
  await page.getByRole("button", { name: "Explore how a claim changes" }).click();
  await page.locator(".static-chapter").waitFor();
  await page.getByRole("button", { name: "3. Revise the claim" }).click();
  await page.locator(".static-chapter").getByText("The cause is still uncertain.").waitFor();
  assert.equal(await page.locator("video, audio").count(), 0);
  await page.screenshot({path: "/tmp/personal-os-mobile-reduced-light.png", fullPage: true});
  await checkVeroInteractions(page, { width: 390, height: 844 }, "mobile-reduced-light");
  await page.close();
  const noScript = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await noScript.goto(`${baseUrl}/work/vero`);
  for (const text of destinations.find(entry => entry.slug === "vero").evidence) await noScript.getByText(text, { exact: true }).waitFor();
  assert.equal(await noScript.evaluate(() => document.documentElement.scrollWidth), 390);
  await noScript.close();
  assert.deepEqual(errors, [], "browser errors");
  console.log("[OK] reduced motion, light theme, zero browser errors");
} finally {
  await browser.close();
}
