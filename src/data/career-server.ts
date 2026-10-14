import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { getPublicCareerContent, validateCareerContent, type CareerContent } from '@/data/career';

type CareerFile = { path: string; mime: string; filename: string; previewPath?: string; previewMime?: string };
type LocalManifest = { content: CareerContent; files: Record<string, CareerFile> };

async function localManifest(): Promise<LocalManifest | null> {
  const filename = process.env.CAREER_LOCAL_DATA;
  if (process.env.CAREER_LOCAL_MODE !== '1' || process.env.VERCEL || !filename || !isAbsolute(filename)) return null;
  try {
    const manifest = JSON.parse(await readFile(filename, 'utf8')) as LocalManifest;
    if (manifest.content.mode !== 'local' || !manifest.files) return null;
    validateCareerContent(manifest.content);
    return manifest;
  } catch { return null; }
}

export async function getCareerContent(): Promise<CareerContent> {
  return (await localManifest())?.content ?? getPublicCareerContent();
}

export async function getCareerFile(id: string, preview = false): Promise<{ bytes: Uint8Array; mime: string; filename: string } | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return null;
  const manifest = await localManifest();
  if (!manifest || !Object.hasOwn(manifest.files, id) || !manifest.content.documents.some(d => d.id === id)) return null;
  const file = manifest.files[id];
  if (!isAbsolute(file.path) || !/^[\w .-]+$/.test(file.filename)) return null;
  if (preview && (!file.previewPath || !isAbsolute(file.previewPath) || file.previewMime !== 'image/png')) return null;
  const path = preview ? file.previewPath! : file.path;
  const mime = preview ? file.previewMime! : file.mime;
  const filename = preview ? `${id}-preview.png` : file.filename;
  try { return { bytes: new Uint8Array(await readFile(path)), mime, filename }; }
  catch { return null; }
}
