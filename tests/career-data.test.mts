import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getPublicCareerContent, validateCareerContent } from '@/data/career';
import { getCareerContent, getCareerFile } from '@/data/career-server';
import { GET } from '@/app/career-files/[id]/route';

test('public snapshot has seven stops, every drawer and no private fields', () => {
  const content = getPublicCareerContent();
  assert.equal(content.chapters.length, 2);
  assert.equal(content.roles.length, 23);
  assert.deepEqual(Object.fromEntries(['Ready', 'Review schedule', 'Review fit', 'Closed'].map(s => [s, content.roles.filter(r => r.preparationStatus === s).length])), {Ready:10,'Review schedule':5,'Review fit':5,Closed:3});
  for (const id of ['applied','cover-letters','cover-letters/assets','cover-letters/tailored','resumes','resumes/assets','resumes/tailored','to-apply','review']) assert.ok(content.folders.some(f => f.id === id));
  assert.ok(content.roles.every(r => !r.fit && !r.gaps && !r.notes && !r.schedule && !r.recordedApplied));
  assert.equal(content.applied.length, 0);
  assert.ok(content.roles.every(r => !r.location.includes('$')));
  assert.doesNotMatch(JSON.stringify(content), /\/Users\/|~\/|\[MURPH\]|fingerprint|CJIS|household|work authorization/i);
  assert.equal(validateCareerContent(content), true);
});

test('content validator rejects duplicate and invalid ids and dangling links', () => {
  const duplicate = getPublicCareerContent();
  duplicate.documents.push(duplicate.documents[0]);
  assert.throws(() => validateCareerContent(duplicate), /duplicate/i);
  const invalid = getPublicCareerContent();
  invalid.documents[0].id = '../escape';
  assert.throws(() => validateCareerContent(invalid), /invalid/i);
  const dangling = getPublicCareerContent();
  dangling.folders[0].documentIds.push('missing');
  assert.throws(() => validateCareerContent(dangling), /unknown/i);
});

test('local gates deny unknown files and fall back to public content', async () => {
  const original = {...process.env};
  try {
    process.env.CAREER_LOCAL_MODE = '0';
    process.env.CAREER_LOCAL_DATA = '/does/not/exist.json';
    assert.equal((await getCareerContent()).mode, 'public');
    assert.equal(await getCareerFile('../escape'), null);
    assert.equal(await getCareerFile('resumes-resume-send-this-pdf', true), null);
    process.env.CAREER_LOCAL_MODE = '1';
    process.env.VERCEL = '1';
    assert.equal((await getCareerContent()).mode, 'public');
    assert.equal(await getCareerFile('resumes-resume-send-this-pdf'), null);
    delete process.env.VERCEL;
    process.env.CAREER_LOCAL_DATA = 'relative.json';
    assert.equal((await getCareerContent()).mode, 'public');
  } finally { process.env = original; }
});

test('attached workbook parser preserves all 23 preparation statuses', {skip: !process.env.CAREER_TEST_WORKBOOK}, () => {
  const result = spawnSync('python3', ['scripts/export-career.py','--check-workbook',process.env.CAREER_TEST_WORKBOOK!], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const rows = JSON.parse(result.stdout);
  assert.equal(rows.length, 23);
  assert.equal(rows.filter((r: {preparationStatus:string}) => r.preparationStatus === 'Ready').length, 10);
  assert.equal(rows.filter((r: {preparationStatus:string}) => r.preparationStatus === 'Closed').length, 3);
  assert.equal(rows[0].company, 'Florida Digital Service');
  assert.equal(rows[0].title, 'Training Consultant');
});


test('local manifest serves only allowlisted source files and never exposes file map', async () => {
  const original = {...process.env};
  const dir = await mkdtemp(join(tmpdir(), 'career-data-'));
  try {
    delete process.env.VERCEL;
    process.env.CAREER_LOCAL_MODE = '1';
    process.env.CAREER_LOCAL_DATA = join(dir, 'manifest.json');
    const content = getPublicCareerContent();
    content.mode = 'local';
    const doc = content.documents[0];
    await writeFile(join(dir, 'source.txt'), 'allowlisted bytes');
    await writeFile(process.env.CAREER_LOCAL_DATA, JSON.stringify({content, files:{[doc.id]:{path:join(dir,'source.txt'),mime:'text/plain',filename:'source.txt'}}}));
    assert.equal((await getCareerContent()).mode, 'local');
    assert.equal('files' in await getCareerContent(), false);
    assert.equal(new TextDecoder().decode((await getCareerFile(doc.id))!.bytes), 'allowlisted bytes');
    assert.equal(await getCareerFile('unknown-document'), null);
    assert.equal(await getCareerFile('unknown-document', true), null);
    assert.equal(await getCareerFile(doc.id, true), null);
    assert.equal(await getCareerFile('__proto__'), null);
    const rawResponse = await GET(new Request('http://localhost/career-files/' + doc.id), {params:Promise.resolve({id:doc.id})});
    assert.match(rawResponse.headers.get('Content-Security-Policy')!, /sandbox/);
    const manifest = JSON.parse(await readFile(process.env.CAREER_LOCAL_DATA, 'utf8'));
    await writeFile(join(dir,'preview.png'), 'preview bytes');
    manifest.files[doc.id].previewPath = join(dir,'preview.png');
    manifest.files[doc.id].previewMime = 'image/png';
    manifest.files[doc.id].mime = 'application/pdf';
    await writeFile(process.env.CAREER_LOCAL_DATA, JSON.stringify(manifest));
    const previewFile = await getCareerFile(doc.id, true);
    assert.equal(previewFile?.mime, 'image/png');
    assert.equal(new TextDecoder().decode(previewFile!.bytes), 'preview bytes');
    const previewResponse = await GET(new Request('http://localhost/career-files/' + doc.id + '?preview=1'), {params:Promise.resolve({id:doc.id})});
    assert.equal(previewResponse.headers.get('Content-Type'), 'image/png');
    const pdfResponse = await GET(new Request('http://localhost/career-files/' + doc.id), {params:Promise.resolve({id:doc.id})});
    assert.equal(pdfResponse.headers.get('Content-Security-Policy'), null);
    assert.equal(pdfResponse.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(pdfResponse.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.match(pdfResponse.headers.get('Content-Disposition')!, /^inline;/);
    process.env.VERCEL = '1';
    assert.equal(await getCareerFile(doc.id), null);
    assert.equal(await getCareerFile(doc.id, true), null);
    assert.equal((await getCareerContent()).mode, 'public');
  } finally { process.env = original; await rm(dir,{recursive:true,force:true}); }
});

test('actual local export preserves source distinctions and existing files', {skip: !process.env.CAREER_TEST_LOCAL}, async () => {
  const manifest = JSON.parse(await readFile(process.env.CAREER_TEST_LOCAL!, 'utf8'));
  assert.equal(validateCareerContent(manifest.content), true);
  assert.equal(manifest.content.roles.filter((r: {recordedApplied?:string}) => r.recordedApplied).length, 14);
  assert.equal(manifest.content.documents.filter((d: {kind:string;body?:string}) => d.kind === 'note' && !!d.body).length, manifest.content.documents.filter((d: {kind:string}) => d.kind === 'note').length);
  for (const file of Object.values(manifest.files) as {path:string}[]) await access(file.path);
  const pdfs = manifest.content.documents.filter((d: {kind:string}) => d.kind === 'pdf');
  assert.equal(pdfs.length, 31);
  for (const doc of pdfs) {
    assert.equal(doc.previewHref, '/career-files/' + doc.id + '?preview=1');
    assert.equal(manifest.files[doc.id].previewMime, 'image/png');
    await access(manifest.files[doc.id].previewPath);
    const png = await readFile(manifest.files[doc.id].previewPath);
    assert.equal(png.subarray(1,4).toString(), 'PNG');
  }
  for (const role of manifest.content.roles) {
    assert.ok(role.resumeId in manifest.files);
    if (role.letterId) assert.ok(role.letterId in manifest.files);
  }
});
