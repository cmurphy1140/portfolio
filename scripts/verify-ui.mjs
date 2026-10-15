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
async function checkHeroOpening(page) {
  const opening="Ideas are cheap to build. Be pragmatically slow.";
  const paragraph=page.locator('main p').first();
  assert.equal(await paragraph.textContent(),opening,'exact corrected opening comes first');
  assert.equal(await page.locator('main').getByText(opening,{exact:true}).count(),1,'one opening');
  assert.equal(await page.getByText('A working record of finding my next role.',{exact:true}).count(),0);
  const presentation=await paragraph.evaluate(element=>{const style=getComputedStyle(element);const hero=element.parentElement;return {weight:Number(style.fontWeight),size:parseFloat(style.fontSize),family:style.fontFamily,bodyFamily:getComputedStyle(hero.querySelector('[data-contrast-check="body"]')).fontFamily,competing:[...hero.querySelectorAll(':scope > p')].some(paragraph=>paragraph.textContent==='Applications are reps.'),beforeName:Boolean(element.compareDocumentPosition(hero.querySelector('h1'))&Node.DOCUMENT_POSITION_FOLLOWING)};});
  assert.ok(presentation.weight>=500&&presentation.weight<=600&&presentation.size>=22&&presentation.size<=28);
  assert.notEqual(presentation.family,presentation.bodyFamily,'opening has the serif voice');
  assert.equal(presentation.competing,false,'home motto is removed while source passages remain');
  assert.equal(presentation.beforeName,true);
}

async function checkHeroGrounding(page) {
  const line=page.locator('[data-hero-grounding]');
  assert.equal(await line.count(),1,'one continuous grounding stroke');
  assert.equal(await line.getAttribute('aria-hidden'),'true');
  const geometry=await line.evaluate(svg=>{
    const path=svg.querySelector('path');const matrix=path.getScreenCTM();
    const point=length=>{const value=path.getPointAtLength(length);return {x:value.x*matrix.a+value.y*matrix.c+matrix.e,y:value.x*matrix.b+value.y*matrix.d+matrix.f};};
    const title=svg.parentElement.querySelector('h1');const y=title.querySelector('[data-hero-y]');const image=svg.parentElement.querySelector('img');
    const rect=element=>{const box=element.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom};};
    return {start:point(0),end:point(path.getTotalLength()),points:Array.from({length:21},(_,i)=>point(path.getTotalLength()*i/20)),title:rect(title),y:rect(y),image:rect(image),pseudo:getComputedStyle(title,'::after').content,pointer:getComputedStyle(svg).pointerEvents,stroke:parseFloat(getComputedStyle(path).strokeWidth),cap:path.getAttribute('stroke-linecap'),join:path.getAttribute('stroke-linejoin')};
  });
  assert.ok(geometry.start.x>=geometry.y.left-14&&geometry.start.x<=geometry.y.right,'stroke starts beneath the final y');
  assert.ok(geometry.start.y>=geometry.title.bottom+2&&geometry.start.y<=geometry.title.bottom+20,'stroke follows the name baseline');
  assert.ok(geometry.end.x>geometry.image.left+40&&geometry.end.x<=geometry.image.right,'stroke ends beneath the seated figure');
  assert.ok(geometry.points.every(point=>point.y>=geometry.image.bottom&&point.y>=geometry.title.bottom),'stroke never crosses name or avatar');
  assert.ok(['none','normal'].includes(geometry.pseudo),'old separate underline is absent');
  assert.equal(geometry.pointer,'none');assert.equal(geometry.cap,'round');assert.equal(geometry.join,'round');
  assert.ok(geometry.stroke>=2.5&&geometry.stroke<=3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'grounding path has no horizontal overflow');
}

async function checkNotebook(page, viewport) {
  await checkHeroOpening(page);
  await checkHeroGrounding(page);
  const notebook=page.getByRole('region',{name:'From my notebook'});
  await notebook.waitFor();
  const note=notebook.locator('[aria-live="polite"]');
  const first=await note.textContent();
  const next=notebook.getByRole('button',{name:'Next note'});
  await next.focus();
  await next.press('Enter');
  assert.notEqual(await note.textContent(),first,'notebook changes only after its button is activated');
  assert.ok(career.approach.concat(career.words).includes((await note.textContent()).trim()),'notebook uses real source wording');
  assert.equal(await next.evaluate(el=>el===document.activeElement),true,'note control keeps keyboard focus');
  const noteCount=(career.approach.length?career.approach:career.words).length;
  await notebook.getByText(`2/${noteCount}`,{exact:true}).waitFor();
  for(let index=1;index<noteCount;index++)await next.press('Enter');
  assert.equal(await note.textContent(),first,'notebook wraps through the source notes');
  await notebook.getByText(`1/${noteCount}`,{exact:true}).waitFor();
  const character=page.getByRole('img',{name:'Faceless cartoon companion sitting cross-legged in a tan shirt and black pants'});
  await character.waitFor();
  await character.evaluate(image=>image.decode());
  const bounds=await character.boundingBox();
  const compact=viewport.width<=700;
  assert.ok(bounds.width>=(compact?(viewport.width<360?85:100):150)&&bounds.width<=(compact?120:170),'character size respects the reading space');
  assert.ok(bounds.x+bounds.width<=viewport.width,'character stays inside viewport');
  const heading=await page.getByRole('heading',{level:1,name:'Connor Murphy.'}).boundingBox();
  const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  assert.equal(overlaps(bounds,heading),false,'character never covers the name');
  assert.equal(await page.getByRole('complementary',{name:'Contextual evidence'}).count(),0,'no right-side evidence panel');
  assert.ok(bounds.x>=heading.x+heading.width,'character sits immediately beside the name');
  assert.ok(bounds.x-heading.x-heading.width<=40,'name and companion form one row');
  const typography=await page.evaluate(()=>{
    const main=getComputedStyle(document.querySelector('main'));
    const title=getComputedStyle(document.querySelector('main h1'));
    const navigation=getComputedStyle(document.querySelector('nav[aria-label="Career folders"] a'));
    const action=getComputedStyle(document.querySelector('a[data-contrast-check="primary action"]'));
    const circle=getComputedStyle(document.querySelector('main ol li a>span'));
    const icon=getComputedStyle(document.querySelector('nav[aria-label="Career folders"] svg'));
    return {body:Number(main.fontWeight),size:parseFloat(main.fontSize),heading:Number(title.fontWeight),navigation:Number(navigation.fontWeight),control:parseFloat(action.borderTopWidth),circle:parseFloat(circle.borderTopWidth),stroke:parseFloat(icon.strokeWidth)};
  });
  assert.ok(typography.body>=500&&typography.size>=16&&typography.heading>=650&&typography.navigation>=500,'stronger rendered typography');
  assert.ok(typography.control>=2&&typography.circle>=2&&typography.stroke>=2,'stronger rendered borders and icon strokes');
  const contrast=await page.evaluate(()=>{
    const luminance=value=>{const rgb=value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
    return [...document.querySelectorAll('[data-contrast-check]')].map(el=>{const style=getComputedStyle(el);let background=style.backgroundColor;let parent=el.parentElement;while(background==='rgba(0, 0, 0, 0)'&&parent){background=getComputedStyle(parent).backgroundColor;parent=parent.parentElement;}const a=luminance(style.color),b=luminance(background);return {label:el.getAttribute('data-contrast-check'),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
  });
  assert.ok(contrast.length>=3,'actual text and button colors measured');
  for(const item of contrast) assert.ok(item.ratio>=4.5,`${item.label}: measured contrast ${item.ratio.toFixed(2)}:1`);
  console.log(`[OK] notebook keyboard/source wording, companion placement, measured contrast ${contrast.map(v=>`${v.label} ${v.ratio.toFixed(2)}:1`).join(', ')}`);
}

async function checkQuickFind(page) {
  const trigger=page.getByRole('button',{name:'Find Career',exact:true});
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'Find Career',exact:true});
  await dialog.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
  const search=dialog.getByRole('searchbox',{name:'Search Career'});
  await search.fill('zzzz-no-result');
  await dialog.getByRole('heading',{name:'No Career results.'}).waitFor();
  await dialog.getByRole('button',{name:'Show all Career results'}).click();
  assert.ok(await dialog.getByRole('link').count()>0);
  assert.ok(await dialog.getByRole('link').count()<=8);
  await search.focus();await page.keyboard.press('Tab');
  assert.equal(await dialog.getByRole('link').first().evaluate(el=>el===document.activeElement),true,'Tab reaches the first result');
  const kindColors=await dialog.locator('a > span').evaluateAll(labels=>labels.map(label=>getComputedStyle(label).color));
  assert.ok(kindColors.every(color=>color==='rgb(244, 248, 252)'),'result kinds keep white text on warm search surfaces');
  await page.addScriptTag({path:axePath});
  const accessibility=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
  for(const violation of accessibility.violations)errors.push(`axe open finder: ${violation.id} ${violation.nodes.map(node=>node.target.join(' ')).join(' | ')}`);
  await page.keyboard.press('Escape');
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'quick find restores focus');
  await page.keyboard.press('Control+k');
  await dialog.waitFor();
  await search.fill('resume');
  await search.press('Control+k');
  assert.equal(await search.inputValue(),'resume','shortcut does not reset active input');
  const result=dialog.getByRole('link').first();
  const href=await result.getAttribute('href');
  assert.ok(href.startsWith('/career/'),'results use known Career routes');
  await result.focus();await result.press('Enter');
  await page.waitForURL(`**${href}`);
  assert.equal(await dialog.isVisible(),false,'quick find closes after navigation');
  await page.goto(baseUrl,{waitUntil:'networkidle'});
  if(await page.getByRole('button',{name:'Open Career navigation'}).isVisible()) {
    await page.goto(`${baseUrl}/career/resumes`,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Open Career navigation'}).click();
    const drawer=page.getByRole('dialog',{name:'Career navigation'});
    const drawerFind=drawer.getByRole('button',{name:'Find Career',exact:true});
    await drawerFind.click();
    await page.keyboard.press('Escape');
    assert.equal(await drawer.isVisible(),true,'Escape keeps the underlying navigation drawer');
    assert.equal(await drawerFind.evaluate(element=>element===document.activeElement),true,'Escape restores focus inside the drawer');
    await drawerFind.click();
    const document=career.documents.find(entry=>entry.folderId==='resumes'&&entry.kind==='note');
    await search.fill(document.title);
    const documentHref=`/career/documents/${document.id}`;
    await dialog.locator(`a[href="${documentHref}"]`).click();
    await page.waitForURL(`**${documentHref}`);
    assert.equal(await dialog.isVisible(),false,'finder closes after drawer result navigation');
    assert.equal(await drawer.isVisible(),false,'underlying drawer closes after folder-to-document navigation');
    await page.getByRole('button',{name:'Open Career navigation'}).click();
    await drawer.getByRole('button',{name:'Find Career',exact:true}).click();
    await search.fill(document.title);
    await dialog.locator(`a[href="${documentHref}"]`).click();
    assert.equal(await drawer.isVisible(),false,'underlying drawer closes when selecting the current document');
    await page.goto(baseUrl,{waitUntil:'networkidle'});
  }
}

async function checkFolderDisclosures(page, viewport) {
  const mobile=viewport.width<=700;
  const openNav=async()=>{if(mobile&&!await page.getByRole('dialog',{name:'Career navigation'}).isVisible())await page.getByRole('button',{name:'Open Career navigation'}).click();return page.getByRole('navigation',{name:'Career folders'});};
  let nav=await openNav();
  const resumes=career.folders.find(folder=>folder.id==='resumes');
  const assets=career.folders.find(folder=>folder.id==='resumes/assets');
  const expand=nav.getByRole('button',{name:`Expand ${resumes.title}`,exact:true});
  await expand.waitFor();
  const hiddenAsset=nav.locator('a[href="/career/resumes/assets"]');
  assert.equal(await hiddenAsset.isVisible(),false,'collapsed folder hides nested links');
  const url=page.url();
  await expand.focus();await expand.press('Tab');
  assert.equal(await nav.locator('a[href="/career/resumes"]').evaluate(element=>element===document.activeElement),true,'folder link follows its disclosure button');
  await page.keyboard.press('Tab');
  assert.equal(await nav.getByRole('button',{name:'Expand Cover letters',exact:true}).evaluate(element=>element===document.activeElement),true,'Tab skips collapsed descendants');
  await expand.focus();await expand.press('Enter');
  assert.equal(page.url(),url,'disclosure never navigates');
  await hiddenAsset.waitFor();
  const assetsToggle=nav.getByRole('button',{name:`Expand ${assets.title}`,exact:true});
  await assetsToggle.press('Space');
  const source=career.documents.find(document=>assets.documentIds.includes(document.id));
  const sourceLink=nav.locator(`a[href="/career/documents/${source.id}"]`);
  await sourceLink.focus();
  const collapseAssets=nav.getByRole('button',{name:`Collapse ${assets.title}`,exact:true});
  await collapseAssets.evaluate(button=>button.click());
  assert.equal(await nav.getByRole('button',{name:`Expand ${assets.title}`,exact:true}).evaluate(button=>button===document.activeElement),true,'collapsing a focused descendant returns focus to its disclosure');
  await nav.getByRole('button',{name:`Expand ${assets.title}`,exact:true}).press('Space');
  await sourceLink.click();
  await page.waitForURL(`**/career/documents/${source.id}`);
  await page.getByRole('heading',{level:1,name:source.title,exact:true}).waitFor();
  nav=await openNav();
  await nav.getByRole('button',{name:`Collapse ${resumes.title}`,exact:true}).waitFor();
  await nav.getByRole('button',{name:`Collapse ${assets.title}`,exact:true}).waitFor();
  await nav.locator('a[href="/career/review"]').click();
  await page.waitForURL('**/career/review');
  await page.reload({waitUntil:'networkidle'});
  nav=await openNav();
  await nav.getByRole('button',{name:`Collapse ${assets.title}`,exact:true}).waitFor();
  const relationships=await page.evaluate(()=>{
    const controls=[...document.querySelectorAll('nav[aria-label="Career folders"] button[aria-controls]')];
    const ids=[...document.querySelectorAll('[id]')].map(element=>element.id);
    return {unique:ids.length===new Set(ids).size,valid:controls.every(button=>{const target=document.getElementById(button.getAttribute('aria-controls'));return target&&target.tagName==='UL'&&target.hidden===(button.getAttribute('aria-expanded')==='false');})};
  });
  assert.deepEqual(relationships,{unique:true,valid:true},'both navigation copies have unique IDs and valid hidden relationships');
  await nav.getByRole('button',{name:`Collapse ${assets.title}`,exact:true}).press('Enter');
  await nav.getByRole('button',{name:`Collapse ${resumes.title}`,exact:true}).press('Enter');
  if(mobile){await page.keyboard.press('Escape');}
  await page.goto(`${baseUrl}/career/documents/${source.id}`,{waitUntil:'networkidle'});
  nav=await openNav();
  await nav.getByRole('button',{name:`Collapse ${assets.title}`,exact:true}).waitFor();
  assert.equal(await nav.locator('[aria-current="page"]').count(),1,'only the document leaf is the current page');
  if(mobile)await page.keyboard.press('Escape');
  await page.goto(baseUrl,{waitUntil:'networkidle'});
}

async function checkChapterMotion(page, reduced=false) {
  await page.addInitScript(()=>{window.careerMotions=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.hasAttribute('data-chapter-motion'))window.careerMotions.push({chapter:this.getAttribute('data-chapter-motion'),frames,duration:options.duration});return animate.call(this,frames,options);};});
  await page.goto(`${baseUrl}/career/walkthrough?stop=${career.chapters[0].id}`,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>window.careerMotions.length),0,'initial chapter is immediately visible without entrance motion');
  const progress=page.getByRole('navigation',{name:'Walkthrough chapters'});
  await progress.evaluate(element=>{window.careerProgress=element;});
  await progress.getByRole('link').nth(1).click();
  await page.waitForURL(`**stop=${career.chapters[1].id}`);
  await page.getByRole('heading',{level:1,name:career.chapters[1].title,exact:true}).waitFor();
  const motions=await page.evaluate(()=>window.careerMotions);
  if(reduced)assert.equal(motions.length,0,'reduced motion avoids chapter animation');
  else {assert.ok(motions.length>=2,'heading and chapter/evidence respond to the chapter change');for(const motion of motions)assert.equal(motion.duration,210);}
  assert.equal(await progress.evaluate(element=>element===window.careerProgress),true,'progress navigation remains mounted');
  await page.goBack();await page.getByRole('heading',{level:1,name:career.chapters[0].title,exact:true}).waitFor();
  await page.goForward();await page.getByRole('heading',{level:1,name:career.chapters[1].title,exact:true}).waitFor();
  await progress.getByRole('link').nth(2).click();
  await progress.getByRole('link').nth(4).click();
  await progress.getByRole('link').nth(6).click();
  await page.waitForURL(`**stop=${career.chapters[career.chapters.length-1].id}`);
  await page.getByRole('heading',{level:1,name:career.chapters[career.chapters.length-1].title,exact:true}).waitFor();
  assert.equal(await page.locator('[data-chapter-motion]').count(),2,'only the latest chapter wrappers remain');

  if(reduced)assert.equal(await page.locator('main').evaluate(element=>element.getAnimations({subtree:true}).length),0);
}

async function checkViewport(name, viewport) {
  const page=await browser.newPage({viewport,colorScheme:'dark'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(baseUrl,{waitUntil:'networkidle'});
  await page.getByRole('heading',{level:1,name:'Connor Murphy.'}).waitFor();
  await checkHeroOpening(page);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
  await checkFolderDisclosures(page,viewport);
  await checkNotebook(page,viewport);
  await checkQuickFind(page);
  if(name==='mobile') {
    const open=page.getByRole('button',{name:'Open Career navigation'});
    await open.click();
    const drawer=page.getByRole('dialog',{name:'Career navigation'});
    await drawer.waitFor();
    const rootToggle=drawer.getByRole('button',{name:/^(Expand|Collapse) Career$/});
    await rootToggle.waitFor();
    assert.equal(await drawer.locator('a[href="/career/resumes/assets"]').count(),1,'nested folders remain represented in disclosures');
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
      await page.getByRole('region',{name:'Receipts at this stop'}).getByText(receipt.title,{exact:true}).waitFor();
    }
  }
  await page.goBack();
  await page.getByRole('heading',{level:1,name:career.chapters[5].title,exact:true}).waitFor();
  await page.getByRole('navigation',{name:'Continue walkthrough'}).getByRole('link',{name:/Next stop/}).click();
  await page.getByRole('heading',{level:1,name:career.chapters[career.chapters.length-1].title,exact:true}).waitFor();
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
    assert.equal(await page.getByRole('complementary',{name:'Contextual evidence'}).count(),0,`${folder.id}: removed side panel`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width,`${folder.id} overflow`);
    for(const id of folder.documentIds) assert.ok(await page.locator(`main a[href="/career/documents/${id}"]`).count()>0,`${id} missing from folder`);
  }
  for(const doc of career.documents) {
    const response=await page.goto(`${baseUrl}/career/documents/${doc.id}`);
    assert.equal(response.status(),200,doc.id);
    assert.equal(await page.getByRole('complementary',{name:'Contextual evidence'}).count(),0,`${doc.id}: removed side panel`);
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

if(process.argv.includes('--career-hero-only')) {
  try {
    for(const width of [320,390,768,1440]) {
      const page=await browser.newPage({viewport:{width,height:900},colorScheme:'dark'});
      await page.goto(baseUrl,{waitUntil:'networkidle'});
      await checkNotebook(page,{width,height:900});
      await page.addScriptTag({path:axePath});
      const result=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
      assert.deepEqual(result.violations.map(violation=>violation.id),[],`${width}px hero accessibility`);
      await page.close();console.log(`[OK] ${width}px: selected companion, continuous grounding stroke, notebook and accessibility`);
    }
  } finally {await browser.close();}
  process.exit(0);
}

if(process.argv.includes('--career-interactions-only')) {
  try {
    for(const width of [320,390,768,1440]) {
      const page=await browser.newPage({viewport:{width,height:900},colorScheme:'dark'});
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(baseUrl,{waitUntil:'networkidle'});
      await checkFolderDisclosures(page,{width,height:900});
      await checkNotebook(page,{width,height:900});
      await checkQuickFind(page);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`${width}: overflow`);
      const chapter=career.chapters[0];
      await page.goto(`${baseUrl}/career/walkthrough?stop=${chapter.id}`,{waitUntil:'networkidle'});
      const receipts=page.getByRole('region',{name:'Receipts at this stop'});
      for(const id of chapter.receiptIds)await receipts.getByText(career.receipts.find(receipt=>receipt.id===id).title,{exact:true}).waitFor();
      assert.equal(await page.getByRole('complementary',{name:'Contextual evidence'}).count(),0);
      await page.close();
      console.log(`[OK] ${width}px: finder/search/keyboard/drawer, notebook, geometry and inline receipts`);
    }
    const blocked=await browser.newPage({viewport:{width:390,height:900}});
    await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Storage unavailable');};Storage.prototype.setItem=()=>{throw new Error('Storage unavailable');};});
    await blocked.goto(`${baseUrl}/career/resumes/assets`,{waitUntil:'networkidle'});
    await blocked.getByRole('button',{name:'Open Career navigation'}).click();
    await blocked.getByRole('dialog',{name:'Career navigation'}).getByRole('button',{name:'Collapse Resume assets',exact:true}).waitFor();
    await blocked.close();
    for(const reduced of [false,true]){const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:reduced?'reduce':'no-preference'});await checkChapterMotion(page,reduced);await page.close();}
    assert.deepEqual(errors,[],'interaction accessibility/browser errors');
    console.log('[OK] focused Career interactions passed');
  } finally { await browser.close(); }
  process.exit(0);
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
