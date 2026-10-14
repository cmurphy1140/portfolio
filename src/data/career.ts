import snapshot from './career-public.json' with { type: 'json' };

export type CareerLink = { label: string; href: string };
export type CareerFolder = { id: string; title: string; path: string; description: string; parentId?: string; documentIds: string[] };
export type CareerDocument = { id: string; title: string; kind: 'note'|'pdf'|'image'|'csv'|'xlsx'; folderId: string; summary: string; body?: string; href?: string; previewHref?: string; sourceLabel: string; localOnly?: boolean; template?: boolean };
export type CareerChapter = { id: string; title: string; summary: string; paragraphs: string[]; links: CareerLink[]; receiptIds: string[] };
export type CareerReceipt = { id: string; title: string; claim: string; detail: string; state: 'Recorded'|'Checked'|'UNTESTED'; sourceLabel: string; href?: string };
export type CareerRole = { id: string; company: string; title: string; location: string; preparationStatus: string; deadline?: string; postingUrl?: string; fit?: string; gaps?: string; schedule?: string; notes?: string; resumeId?: string; letterId?: string; recordedApplied?: string; recordedContact?: string };
export type CareerApplied = { id: string; company: string; title: string; status: string; dateApplied?: string; lastContact?: string; note?: string };
export type CareerContent = { mode: 'public'|'local'; asOf: string; folders: CareerFolder[]; documents: CareerDocument[]; chapters: CareerChapter[]; receipts: CareerReceipt[]; roles: CareerRole[]; applied: CareerApplied[]; words: string[]; approach: string[]; projects: CareerLink[] };

export function validateCareerContent(content: CareerContent): true {
  for (const collection of [content.documents, content.roles, content.receipts, content.chapters, content.applied]) {
    const ids = new Set<string>();
    for (const item of collection) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) throw new Error(`Invalid Career id: ${item.id}`);
      if (ids.has(item.id)) throw new Error(`Duplicate Career id: ${item.id}`);
      ids.add(item.id);
    }
  }
  const folderIds = new Set(content.folders.map(f => f.id));
  if (folderIds.size !== content.folders.length) throw new Error('Duplicate Career folder');
  const documentIds = new Set(content.documents.map(d => d.id));
  const receiptIds = new Set(content.receipts.map(r => r.id));
  for (const f of content.folders) {
    if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(f.id)) throw new Error(`Invalid folder: ${f.id}`);
    for (const id of f.documentIds) if (!documentIds.has(id)) throw new Error(`Unknown document: ${id}`);
    if (f.parentId && !folderIds.has(f.parentId)) throw new Error(`Unknown parent: ${f.parentId}`);
  }
  for (const d of content.documents) if (!folderIds.has(d.folderId)) throw new Error(`Unknown folder: ${d.folderId}`);
  for (const c of content.chapters) for (const id of c.receiptIds) if (!receiptIds.has(id)) throw new Error(`Unknown receipt: ${id}`);
  for (const r of content.roles) for (const id of [r.resumeId, r.letterId]) if (id && !documentIds.has(id)) throw new Error(`Unknown role document: ${id}`);
  return true;
}

export function getPublicCareerContent(): CareerContent {
  return structuredClone(snapshot) as CareerContent;
}

export const careerNavigation: { id: string; title: string; href: string; parentId?: string }[] = snapshot.folders.filter(f => f.id !== 'root').map(f => ({ id: f.id, title: f.title, href: `/career/${f.id}`, ...('parentId' in f ? { parentId: f.parentId } : {}) }));
