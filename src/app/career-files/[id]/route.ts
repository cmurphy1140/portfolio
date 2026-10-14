import { getCareerFile } from '@/data/career-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getCareerFile(id, new URL(request.url).searchParams.get('preview') === '1');
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(file.bytes as BodyInit, { headers: {
    'Content-Type': file.mime,
    'Content-Disposition': `${file.mime === 'application/pdf' || file.mime.startsWith('image/') ? 'inline' : 'attachment'}; filename="${file.filename}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(file.mime === 'application/pdf' || file.mime === 'image/png'
      ? {} : { 'Content-Security-Policy': "default-src 'none'; sandbox" }),
  } });
}
