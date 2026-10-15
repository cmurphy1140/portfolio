export function filterRoles<T extends {company:string;title:string;location:string;preparationStatus:string}>(roles:T[], query:string, status:string):T[] {
 const search=query.trim().toLowerCase();
 return roles.filter(role=>(status==='All'||role.preparationStatus===status)&&`${role.company} ${role.title} ${role.location}`.toLowerCase().includes(search));
}
export function safeHref(value?:string):string|undefined {
 if (!value || /[\\\x00-\x1f]/.test(value)) return undefined;
 return (/^\/(?!\/)/.test(value)||/^https?:\/\//i.test(value))?value:undefined;
}
export function noteHref(target:string, documents:{id:string;title:string;sourceLabel:string}[]):string|undefined {
 const [base,heading]=target.split('#');
 const normalized=base.replace(/\.md$/i,'').toLowerCase();
 const anchor=heading?'#'+headingSlug(heading):'';
 const doc=documents.find(d=>d.sourceLabel.replace(/\.md$/i,'').toLowerCase()===normalized||d.title.toLowerCase()===normalized||d.sourceLabel.replace(/\.md$/i,'').toLowerCase().endsWith('/'+normalized));
 if(doc) return `/career/documents/${encodeURIComponent(doc.id)}${anchor}`;
 const folders:Record<string,string>={'career/career-root':'/career','career/to-apply/to-apply':'/career/to-apply','career/resumes/resumes':'/career/resumes','career/cover-letters/cover-letters':'/career/cover-letters','career/applied/applied':'/career/applied','career/the-walkthrough':'/career/walkthrough','career/the-receipts':'/career/receipts'};
 return folders[normalized];
}

export function headingSlug(value:string):string { return value.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu,'').replace(/\s+/g,'-'); }
export function cleanNote(body:string):string { return body.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'').replace(/%%[\s\S]*?%%/g,''); }
export function noteTable(block:string):{headers:string[];rows:string[][]}|undefined {
 const lines=block.trim().split('\n');
 if(lines.length<2||!/^\s*\|?\s*:?-{3,}/.test(lines[1]))return undefined;
 const cells=(line:string)=>line.trim().replace(/^\||\|$/g,'').split('|').map(value=>value.trim());
 const headers=cells(lines[0]);
 if(!cells(lines[1]).every(value=>/^:?-{3,}:?$/.test(value)))return undefined;
 return {headers,rows:lines.slice(2).map(line=>{const row=cells(line);return headers.map((_,i)=>row[i]||'');})};
}

export function folderBranch(folderId?:string):string[] {
 if(!folderId)return [];
 if(folderId==='root')return ['root'];
 const parts=folderId.split('/');
 return ['root',...parts.map((_,index)=>parts.slice(0,index+1).join('/'))];
}
