import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRoles, safeHref, noteHref, cleanNote, noteTable, folderBranch } from '@/components/career/logic';

test('search combines preparation filter and company/title/location text', () => {
 const roles = [{id:'a',company:'UCF',title:'Engineer',location:'Orlando',preparationStatus:'Ready'}, {id:'b',company:'UCF',title:'Analyst',location:'Remote',preparationStatus:'Review fit'}];
 assert.deepEqual(filterRoles(roles,' ucf ','Ready').map(r=>r.id), ['a']);
 assert.equal(filterRoles(roles,'missing','All').length,0);
 assert.equal(filterRoles(roles,'remote','All')[0].id,'b');
});
test('document links reject executable and protocol-relative URLs', () => {
 for (const value of ['javascript:alert(1)','data:text/html,bad','//evil.test','/\\evil.test']) assert.equal(safeHref(value),undefined);
 assert.equal(safeHref('/career/resumes'),'/career/resumes');
 assert.equal(safeHref('https://example.com/job'),'https://example.com/job');
});
test('wikilinks resolve only to known documents or Career destinations', () => {
 const docs=[{id:'abc',title:'My note',sourceLabel:'Career/resumes/My note.md'}];
 assert.equal(noteHref('Career/resumes/My note',docs),'/career/documents/abc');
 assert.equal(noteHref('unknown-note',docs),undefined);
 assert.equal(noteHref('Career/to-apply/to-apply',docs),'/career/to-apply');
});

test('real Obsidian embeds and heading links retain an owning document', () => {
 const docs=[{id:'master',title:'Resume master',sourceLabel:'Career/resumes/resume-SEND-THIS.md'}];
 assert.equal(noteHref('Career/resumes/resume-SEND-THIS#Experience',docs),'/career/documents/master#experience');
});

test('source comments are hidden and Markdown table headers remain structured', () => {
 assert.equal(cleanNote('Before %% private editor comment %% after'), 'Before  after');
 assert.deepEqual(noteTable('| Work | State |\n| --- | --- |\n| Scorer | Planned |'), {headers:['Work','State'],rows:[['Scorer','Planned']]});
 assert.equal(noteTable('ordinary | sentence'),undefined);
});

test('deep document navigation opens its folder ancestors without unrelated branches', () => {
 assert.deepEqual(folderBranch('cover-letters/tailored'),['root','cover-letters','cover-letters/tailored']);
 assert.deepEqual(folderBranch('root'),['root']);
 assert.deepEqual(folderBranch(undefined),[]);
});
