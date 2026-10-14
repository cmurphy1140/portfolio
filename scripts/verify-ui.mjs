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

const career = JSON.parse(await readFile(new URL('../src/data/career-public.json', import.meta.url), 'utf8'));
async function checkViewport(name, viewport) {
  const page=await browser.newPage({viewport,colorScheme:'dark'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(baseUrl,{waitUntil:'networkidle'});
  await page.getByRole('heading',{level:1,name:'Connor Murphy.'}).waitFor();
  await page.getByText('Applications are reps.',{exact:true}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
  if(name==='mobile') {
    const open=page.getByRole('button',{name:'Open Career navigation'});
    await open.click();
    const drawer=page.getByRole('dialog',{name:'Career navigation'});
    await drawer.waitFor();
    for(const folder of career.folders.filter(f=>f.id!=='root')) assert.equal(await drawer.locator(`a[href="/career/${folder.id}"]`).count(),1,`${folder.id} missing from mobile navigation`);
    await page.keyboard.press('Escape');
    assert.equal(await open.evaluate(el=>el===document.activeElement),true,'drawer restores focus');
  }
  await page.screenshot({path:`/tmp/career-${process.env.CAREER_UI_MODE||'public'}-${name}-home.png`,fullPage:true});
  await page.getByRole('link',{name:'Walk with me'}).click();
  const progress=page.getByRole('navigation',{name:'Walkthrough chapters'});
  await progress.getByRole('link').first().waitFor();
  assert.equal(await progress.getByRole('link').count(),7);
  for(const [index,chapter] of career.chapters.entries()) {
    await progress.getByRole('link',{name:`${index+1}. ${chapter.title}`,exact:true}).click();
    await page.getByRole('heading',{level:1,name:chapter.title,exact:true}).waitFor();
    await page.waitForURL(`**/career/walkthrough?stop=${chapter.id}`);
    for(const id of chapter.receiptIds) {
      const receipt=career.receipts.find(r=>r.id===id);
      await page.getByRole('complementary',{name:'Contextual evidence'}).getByText(receipt.title,{exact:true}).waitFor();
    }
  }
  await page.goBack();
  await page.getByRole('heading',{level:1,name:career.chapters[5].title,exact:true}).waitFor();
  await page.getByRole('navigation',{name:'Continue walkthrough'}).getByRole('link',{name:/Next stop/}).click();
  await page.getByRole('heading',{level:1,name:career.chapters[6].title,exact:true}).waitFor();
  await page.getByRole('navigation',{name:'Continue walkthrough'}).getByRole('link',{name:/Previous stop/}).click();
  await page.getByRole('heading',{level:1,name:career.chapters[5].title,exact:true}).waitFor();
  await page.goto(`${baseUrl}/career/to-apply`);
  await page.getByRole('status').getByText('23 of 23 roles',{exact:true}).waitFor();
  for(const status of [...new Set(career.roles.map(r=>r.preparationStatus))]) {
    await page.getByRole('combobox',{name:/^Preparation status/}).selectOption(status);
    assert.equal(await page.locator('main details').count(),career.roles.filter(r=>r.preparationStatus===status).length);
  }
  await page.getByRole('combobox',{name:/^Preparation status/}).selectOption('All');
  const search=page.getByRole('searchbox',{name:'Search applications'});
  await search.fill(career.roles[0].company);
  assert.equal(await page.locator('main details').count(),career.roles.filter(r=>`${r.company} ${r.title} ${r.location}`.toLowerCase().includes(career.roles[0].company.toLowerCase())).length);
  await search.fill('zzzz-no-match');
  await page.getByRole('heading',{name:'No roles match.'}).waitFor();
  await page.getByRole('button',{name:'Show all applications'}).click();
  assert.equal(await page.locator('main details').count(),23);
  await page.locator('main details summary').first().click();
  assert.ok(await page.locator('main details').first().getAttribute('open')!==null);
  await page.screenshot({path:`/tmp/career-${process.env.CAREER_UI_MODE||'public'}-${name}-applications.png`,fullPage:true});
  for(const folder of career.folders.filter(f=>f.id!=='root')) {
    const response=await page.goto(`${baseUrl}/career/${folder.id}`);
    assert.equal(response.status(),200,folder.id);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width,`${folder.id} overflow`);
    for(const id of folder.documentIds) assert.ok(await page.locator(`main a[href="/career/documents/${id}"]`).count()>0,`${id} missing from folder`);
  }
  for(const doc of career.documents) {
    const response=await page.goto(`${baseUrl}/career/documents/${doc.id}`);
    assert.equal(response.status(),200,doc.id);
    await page.getByRole('heading',{level:1,name:doc.title,exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width,`${doc.id} overflow`);
  }
  const resume=career.documents.find(d=>d.kind==='pdf'&&d.href);
  await page.goto(`${baseUrl}/career/documents/${resume.id}`);
  const trigger=page.getByRole('button',{name:'Preview PDF'});
  await trigger.click();
  await page.getByRole('dialog',{name:resume.title}).waitFor();
  assert.ok(await page.locator('dialog img[alt], dialog iframe[title]').count()>0);
  await page.keyboard.press('Escape');
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'preview restores focus');
  for(const route of ['/career/receipts','/career/my-words','/career','/timeline',...routes]) {
    const response=await page.goto(`${baseUrl}${route}`);
    assert.equal(response.status(),200,route);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width,`${route} overflow`);
  }
  const mode=process.env.CAREER_UI_MODE||'public';
  const privateDoc=career.documents.find(d=>d.localOnly&&d.kind==='pdf');
  const privateResponse=await page.request.get(`${baseUrl}/career-files/${privateDoc.id}`);
  assert.equal(privateResponse.status(),mode==='local'?200:404,'private download boundary');
  const missing=await page.request.get(`${baseUrl}/career/documents/not-a-document`);
  assert.equal(missing.status(),404);
  await page.close();
  for(const scheme of ['dark','light']) {
    const axePage=await browser.newPage({viewport,colorScheme:scheme});
    for(const route of ['/', '/career/walkthrough', '/career/to-apply','/career/resumes','/career/applied',...routes]) {
      await axePage.goto(`${baseUrl}${route}`,{waitUntil:'networkidle'});
      await axePage.addScriptTag({path:axePath});
      const results=await axePage.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
      for(const violation of results.violations) errors.push(`axe ${name} ${scheme} ${route}: ${violation.id} ${violation.nodes.map(n=>n.target.join(' ')).join(' | ')}`);
    }
    await checkVeroInteractions(axePage,viewport,`${name}-${scheme}`);
    await axePage.close();
  }
  console.log(`[OK] ${name}: seven chapters, 23 filtered roles, every folder/document, previews/focus, legacy case studies, no overflow`);
}

try {
  await checkViewport("mobile", { width: 390, height: 844 });
  await checkViewport("desktop", { width: 1440, height: 1000 });
  const page = await browser.newPage({ viewport: {width: 390, height: 844}, reducedMotion: "reduce", colorScheme: "light" });
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(baseUrl);
  await page.getByRole('link',{name:'Walk with me'}).click();
  await page.getByRole('navigation',{name:'Walkthrough chapters'}).getByRole('link').nth(2).click();
  await page.getByRole('heading',{level:1,name:career.chapters[2].title,exact:true}).waitFor();
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
