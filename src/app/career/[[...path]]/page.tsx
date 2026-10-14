import { notFound } from 'next/navigation';
import Fieldbook from '@/components/career/fieldbook';
import { getCareerContent } from '@/data/career-server';
export const dynamic = 'force-dynamic';
export default async function CareerPage({params,searchParams}:{params:Promise<{path?:string[]}>;searchParams:Promise<{stop?:string}>}) {
 const [{path=[]},{stop},content]=await Promise.all([params,searchParams,getCareerContent()]);
 const view=path.length?path.join('/'):'root';
 if(path[0]==='documents') {
  if(path.length!==2||!content.documents.some(d=>d.id===path[1])) notFound();
  return <Fieldbook content={content} view="documents" documentId={path[1]}/>;
 }
 if(!['root','walkthrough','receipts','my-words','to-apply','applied'].includes(view)&&!content.folders.some(f=>f.id===view||f.path===view||f.path===`Career/${view}`))notFound();
 if(view==='walkthrough'&&stop&&!content.chapters.some(c=>c.id===stop))notFound();
 return <Fieldbook content={content} view={view} stop={stop}/>;
}
