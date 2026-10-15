#!/usr/bin/env python3
"""Export a selected public showcase and a complete, external local manifest.

Only the explicitly selected resume and preview are copied to public/. Workbook
text is data: no instructions, formulas, links or embedded commands are executed.
Uses the Python standard library; Excel is not required.
"""
import argparse
import copy
import csv
import datetime
import json
import mimetypes
from pathlib import Path
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
import zipfile

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
AS_OF = '2026-10-14'

def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')

def workbook_rows(path):
    with zipfile.ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(s.itertext()) for s in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        rows = []
        for row in ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('.//m:row', NS):
            cells = {}
            for cell in row.findall('m:c', NS):
                value = cell.find('m:v', NS)
                inline = cell.find('m:is', NS)
                text = value.text if value is not None else ''.join(inline.itertext()) if inline is not None else ''
                if cell.get('t') == 's':
                    text = strings[int(text)]
                cells[re.sub(r'\d', '', cell.get('r'))] = text or ''
            rows.append(cells)
        return rows

def excel_date(value):
    if not value:
        return ''
    if re.fullmatch(r'\d+(?:\.\d+)?', value):
        return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(value)))).isoformat()
    return value

def parse_shortlist(path):
    roles = []
    for row in workbook_rows(path):
        if not row.get('A', '').isdigit() or ' — ' not in row.get('B', ''):
            continue
        company, title = row['B'].split(' — ', 1)
        role = dict(id=slug(company + '-' + title), company=company, title=title,
                    location=row.get('C', ''), preparationStatus=row.get('J', ''),
                    deadline=excel_date(row.get('G', '')), postingUrl=row.get('M', ''),
                    fit=row.get('H', ''), gaps=row.get('I', ''), schedule=row.get('D', ''),
                    notes=row.get('L', ''))
        if role['preparationStatus'] not in ['Ready', 'Review schedule', 'Review fit', 'Closed']:
            raise ValueError('Unknown preparation status')
        roles.append(role)
    if len({r['id'] for r in roles}) != len(roles):
        raise ValueError('Duplicate role id')
    return roles

FOLDERS = [
    ('root', 'Career', 'The walkthrough, the proof, and the thinking behind the work.'),
    ('resumes', 'Resumes', 'Start with the current resume, then choose a version for your audience.'),
    ('resumes/assets', 'Resume assets', 'A page preview and duplicate PDF of the main professional resume.'),
    ('resumes/tailored', 'Audience variants', 'Compare versions for IT and analyst roles, relocation, and professional networking.'),
    ('cover-letters', 'Cover letters', 'A reusable master and employer-specific writing. Templates retain their intentional placeholders.'),
    ('cover-letters/assets', 'Supporting writing', 'Application fields, KSA answers, and supporting prose are available in the local workspace.'),
    ('cover-letters/tailored', 'Tailored letters', 'Sixteen note/PDF pairs, six employer letters available as PDFs, and one general template. Drafts are separate from sends.'),
    ('to-apply', 'To apply', 'Search the shortlist and compare preparation status before choosing your next application.'),
    ('applied', 'Applied', 'Review recorded application history and follow-up notes.'),
    ('review', 'Document review', 'Follow how the resume and cover letter are reviewed and revised.'),
]

PROJECTS = [dict(label='Catch 5', href='/work/catch-5'), dict(label='Drive Score', href='/work/drive-score'), dict(label='Vero', href='/work/vero'), dict(label='Job tracker', href='/work/tracker-digest')]

CHAPTERS = [
    ('outgoing', 'Resume', 'One base résumé, tuned by audience.', ['One base résumé, with the emphasis shifted by the kind of role: software, IT or analyst.', 'Every cover letter started from one base and was written to one posting. Any number without backing came off the page, even the strongest line.'], ['documents'], ['resumes', 'cover-letters']),
    ('projects', 'Projects', 'Things that ran, with evidence attached.', ['Catch 5 was the card game played at home, built as an iPhone app. It showed ownership from start to finish: the rules, the interface, the testing and the release.', 'Drive Score rebuilt the data pipeline from the Liberty Mutual internship without a team around it, carrying that experience into independent work.', 'Vero, a home-automation client, separated what a device reported from what it actually did. That careful checking is exactly what a team wants from a new engineer.', 'tracker-digest turned the job search itself into a small tool, a habit of measuring before deciding.'], [], []),
    ('selection', 'Filter', 'Applied wide, accepted narrow.', ['Searches ran more than one way, because each found roles the other missed. Every posting was read for warning signs: constant on-call, ticket quotas, being the only IT person.', 'The shortlist held 23 roles: 10 ready to send, five to check on schedule, five to check on fit and three closed. The bar for accepting stayed narrow: predictable hours and a team that supported people.'], ['selection'], ['to-apply']),
]

def public_receipts():
    rows = [
        ('catch-five','Catch 5','264 tests recorded','The project record reports a clean published-code run on October 14, 2026: 93 engine and 171 view-model tests. This website export did not rerun them.','the-receipts.md','/work/catch-5'),
        ('vero','Vero','318 tests, one skipped, recorded','The project record reports a clean GitHub main check on October 14, 2026. Its earlier 277 count was corrected. This export did not rerun the project.','the-receipts.md','/work/vero'),
        ('drive-score','Drive Score','26 tests recorded','The project record records a clean-export check dated October 12, 2026. This export did not rerun the project.','the-receipts.md','/work/drive-score'),
        ('precision','Precision','Remove a number that cannot be defended','The source describes revising application materials and adding a regression check. This export presents the recorded practice, not a newly executed check.','the-receipts.md',''),
        ('documents','Outgoing documents','One current resume; audience-specific variants','The current mapped main file is resume-SEND-THIS.pdf. An older index reference to an October 14 master is absent; it is not invented here.','resumes/resumes.md','/career/documents/resumes-resume-send-this-pdf'),
        ('selection','Search selection','Independent sweeps; explicit preparation labels','Job_Applications.xlsx supplies the 23-role shortlist. Ready, Review schedule, Review fit and Closed describe preparation as recorded, not live posting status.','to-apply/to-apply.md','/career/to-apply'),
        ('measurement','Measurement','Screens per twenty applications','The project record records tracker-digest v0.1.0, 33 tests, and Python 3.10, 3.12 and 3.14 CI, released October 4, 2026. The newer review qualifies the shipped tool as a CSV follow-up digest; automated conversion scoring is unverified. Not rerun by this export.','the-receipts.md','/work/tracker-digest'),
        ('pre-ai','Dated original work','Compare the original approach with a rebuild','The walkthrough describes CS770 work dated September–December 2022. The original commit histories have not been independently inspected for this website.','the-walkthrough.md',''),
        ('contribution','Communication and follow-through','Practical habits across technical and service work','The walkthrough connects teaching, restaurants and county golf-course work to explanation, documentation and dependable operations.','the-walkthrough.md','/career/resumes'),
    ]
    return [dict(id=i,title=t,claim=c,detail=d,state='Recorded',sourceLabel='Career/'+s,**({'href':h} if h else {})) for i,t,c,d,s,h in rows]

def describe_document(path, folder_id):
    stem = path.stem
    kind = path.suffix.lower()
    if folder_id == 'review':
        return (stem.replace('-', ' '), 'Review draft: proposed wording and emphasis, awaiting final voice review.')
    if stem == 'resume-SEND-THIS':
        if kind == '.png':
            return ('Resume preview', 'See the current one-page resume before opening the PDF.')
        if kind == '.pdf':
            return ('Current resume' if folder_id == 'resumes' else 'Resume PDF asset', 'One-page resume connecting software, teaching, and practical operations.')
        return ('Resume source and revisions', 'The written resume, its supporting notes, and the record of revisions.')
    if folder_id == 'resumes/tailored':
        variants = {
            'resume-SEND-THIS-it-and-analyst': ('IT and analyst resume', 'Audience variant for IT and analyst roles; consult the local review before sending.'),
            'resume-SEND-THIS-relocating': ('Relocating resume', 'Audience variant for opportunities that involve a move.'),
            'resume-savant-network': ('Networking resume', 'A version for professional introductions and networking.'),
        }
        if stem in variants: return variants[stem]
    if stem == 'cover-letter-MASTER':
        return ('Cover-letter template' + (' source' if kind == '.md' else ''), 'Reusable letter structure with intentional role and company placeholders.')
    if stem == 'cover-letter-general':
        return ('General letter template', 'An untailored starting point; complete the company details before using it.')
    if stem.startswith('cover-letter-'):
        employer = stem.removeprefix('cover-letter-').replace('-', ' ').title()
        return (employer + (' · letter' if kind == '.pdf' else ' · letter source'), 'Employer-specific letter draft' + (', ready to preview as a PDF.' if kind == '.pdf' else ', retained as editable writing.'))
    descriptions = {
        'career-root': ('Career overview', 'The four main drawers and the principles that connect them.'),
        'the-walkthrough': ('The walkthrough', 'Seven stops connecting mindset, work, selection, and evidence.'),
        'the-receipts': ('The proof', 'Read the evidence and qualifications behind the walkthrough.'),
        'my-words-2026-10-14': ('My words', 'Original phrasing and reflections, preserved in the local workspace.'),
        'base-resume-cover-letter-plan': ('Resume and letter revision plan', 'The proposed direction for revising the core application documents.'),
        'base-resume-cover-letter-review': ('Resume and letter revision notes', 'Working feedback on the next resume and cover-letter drafts.'),
        'resumes': ('Resume guide', 'Choose the main resume, an audience variant, or the page preview.'),
        'cover-letters': ('Cover-letter guide', 'Find employer drafts, templates, and supporting answers.'),
        'to-apply': ('Shortlist guide', 'Understand the preparation queue and the next steps recorded in it.'),
        'applied': ('Application history guide', 'Read the recorded sends and their follow-up context.'),
        'ksa-answers': ('KSA answers', 'Supporting answers for Knowledge, Skills and Abilities questions.'),
        'application-form-kit': ('Application form kit', 'Personal application fields and reusable answers, available locally.'),
        'the-closing': ('The closing', 'Supporting writing for bringing a letter to a clear close.'),
        'leads-2026-10-12': ('Historical leads tracker', 'The full recorded research tracker, distinct from confirmed submissions.'),
        'applications': ('Vault application tracker' if kind == '.xlsx' else 'Vault application records', 'The vault tracker snapshot; kept separate from the attached preparation shortlist.'),
    }
    return descriptions.get(stem, (stem.replace('-', ' '), 'Supporting Career document, available in the local workspace.'))

def build(source, workbook):
    folders = [dict(id=i,title=t,path='Career' if i=='root' else 'Career/'+i,description=d,documentIds=[],**({'parentId':i.rsplit('/',1)[0]} if '/' in i else {})) for i,t,d in FOLDERS]
    folder_map = {f['id']:f for f in folders}
    documents, files = [], {}
    kinds = {'.md':'note','.pdf':'pdf','.png':'image','.csv':'csv','.xlsx':'xlsx'}
    for path in sorted(source.rglob('*')):
        if not path.is_file() or (path.name == '.DS_Store' or path.name.startswith('~$')):
            continue
        if path.suffix.lower() not in kinds:
            raise ValueError('Unmapped file type: '+path.name)
        rel = path.relative_to(source).as_posix()
        folder_id = str(path.relative_to(source).parent).replace('.', 'root')
        if folder_id not in folder_map:
            raise ValueError('Unmapped folder: '+folder_id)
        id = slug(rel)
        if id in files:
            raise ValueError('Duplicate document id: '+id)
        title, summary = describe_document(path, folder_id)
        document = dict(id=id,title=title,kind=kinds[path.suffix.lower()],folderId=folder_id,summary=summary,sourceLabel='Career/'+rel,localOnly=True)
        if 'MASTER' in path.name or path.stem == 'cover-letter-general':
            document['template'] = True
            document['summary'] = 'Reusable template. Intentional role/company placeholders remain; this is not a completed employer letter.'
        documents.append(document)
        folder_map[folder_id]['documentIds'].append(id)
        files[id] = dict(path=str(path.resolve()),mime=mimetypes.guess_type(path)[0] or 'application/octet-stream',filename=path.name)
    # The attached workbook is a distinct source, not a replacement of the vault workbook.
    id = 'attached-job-applications-xlsx'
    documents.append(dict(id=id,title='Attached job applications',kind='xlsx',folderId='to-apply',summary='23-role preparation shortlist supplied separately from the vault tracker.',sourceLabel='Job_Applications.xlsx · Job shortlist',localOnly=True))
    folder_map['to-apply']['documentIds'].append(id)
    files[id] = dict(path=str(workbook.resolve()),mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',filename=workbook.name)
    roles = parse_shortlist(workbook)
    lookup = {slug(r['A']+'-'+r['B']):r for r in workbook_rows(source/'to-apply/applications.xlsx') if r.get('C')=='lead'}
    letter_keys = {'Florida Digital Service':'florida-digital-service-training-consultant','Florida Department of Corrections':'fdc-systems-project-analyst','City of Deerfield Beach':'deerfield-beach-business-analyst'}
    for role in roles:
        old = lookup.get(role['id'], {})
        if old.get('E'): role['recordedApplied'] = old['E']
        if old.get('F'): role['recordedContact'] = excel_date(old['F'])
        key = letter_keys.get(role['company'])
        if role['company']=='UCF':
            key = next((k for k in ['ucf-it-project-manager-i','ucf-cloud-computing-engineer-i','ucf-applications-programmer-ii','ucf-transformational-giving-analyst'] if slug(role['title']).startswith(k[4:])), None)
        role['resumeId'] = 'resumes-resume-send-this-pdf'
        if key and 'cover-letters-tailored-cover-letter-'+key+'-pdf' in files:
            role['letterId'] = 'cover-letters-tailored-cover-letter-'+key+'-pdf'
    chapters = [dict(id=i,title=t,summary=s,paragraphs=p,links=[dict(label=folder_map[f]['title'],href='/career/'+f) for f in fs] + (PROJECTS if i=='projects' else []),receiptIds=rs) for i,t,s,p,rs,fs in CHAPTERS]
    public_roles = [{k:v for k,v in r.items() if k in ['id','company','title','location','preparationStatus','postingUrl','resumeId']} for r in roles]
    for role in public_roles:
        role['location'] = re.sub(r'; \$[^\n]+', '', role['location'])
    public = dict(mode='public',asOf=AS_OF,folders=folders,documents=documents,chapters=chapters,receipts=public_receipts(),roles=public_roles,applied=[],words=['If the storm is coming, be a lighthouse.','be true to the numbers','The proof is in the action, but I need to show where im headed, how i tuned my compass, and why'],approach=['Applications are free.','Precision is the argument.','Stay useful inside whatever a team needs.'],projects=PROJECTS)
    for d in documents:
        if d['id'] in ['resumes-resume-send-this-pdf','resumes-assets-resume-send-this-png','resumes-assets-resume-send-this-pdf']:
            d['localOnly'] = False
            d['href'] = '/career/resume-SEND-THIS.'+('png' if d['kind']=='image' else 'pdf')
            d['previewHref'] = '/career/resume-SEND-THIS.png'
    local = copy.deepcopy(public)
    local['mode'] = 'local'
    local['roles'] = roles
    with (source/'applied/leads-2026-10-12.csv').open(newline='') as f:
        raw_rows = list(csv.DictReader(f))
    local['applied'] = [dict(id=slug(r['company']+'-'+r['title']),company=r['company'],title=r['title'],status=r['status'],dateApplied=r['date_applied'],lastContact=r['last_contact'],note=r['notes']) for r in raw_rows if r['status'] in ['applied','rejected','withdrawn']]
    for d in local['documents']:
        d['href'] = '/career-files/'+d['id']
        if d['kind']=='note': d['body'] = Path(files[d['id']]['path']).read_text()
        if d['kind']=='pdf': d['previewHref'] = d['href']
        if d['kind']=='image': d['previewHref'] = d['href']
    walkthrough = (source/'the-walkthrough.md').read_text()
    sections = re.findall(r'^## \d+\. (.*?)\n(.*?)(?=^## |\Z)',walkthrough,re.M|re.S)
    if len(sections)!=7: raise ValueError('Expected seven walkthrough chapters')
    # Keep the qualified reading chapters. The complete original walkthrough,
    # including Obsidian embeds and superseded claims, remains a local note.
    words = (source/'my-words-2026-10-14.md').read_text()
    local['words'] = re.findall(r'^> (.+)$',words,re.M)
    # Raw notes preserve every local source; source receipts are never promoted to a fresh Checked run.
    return public, dict(content=local,files=files)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path)
    parser.add_argument('--workbook',type=Path)
    parser.add_argument('--local-output',type=Path)
    parser.add_argument('--check-workbook',type=Path)
    args=parser.parse_args()
    if args.check_workbook:
        print(json.dumps(parse_shortlist(args.check_workbook)))
        return
    if not all([args.source,args.workbook,args.local_output]): parser.error('--source, --workbook and --local-output are required')
    repo=Path(__file__).resolve().parents[1]
    local_path=args.local_output.resolve()
    if local_path.is_relative_to(repo): parser.error('Local output must be outside the repository')
    def source_stats():
        return {str(p): (p.stat().st_size, p.stat().st_mtime_ns) for p in [*args.source.rglob('*'), args.workbook] if p.is_file() and p.name != '.DS_Store' and not p.name.startswith('~$')}
    before = source_stats()
    public, local=build(args.source,args.workbook)
    pdfs = [d for d in local['content']['documents'] if d['kind'] == 'pdf']
    if pdfs:
        renderer = shutil.which('pdftoppm')
        if not renderer:
            parser.error('PDF previews require pdftoppm from Poppler. Install Poppler, add pdftoppm to PATH, then run career:sync again.')
        previews = local_path.parent/'career-previews'
        previews.mkdir(exist_ok=True)
        previews.chmod(0o700)
        for document in pdfs:
            file = local['files'][document['id']]
            prefix = previews/document['id']
            result = subprocess.run([renderer, '-f', '1', '-l', '1', '-singlefile', '-scale-to', '1600', '-png', file['path'], str(prefix)], capture_output=True, text=True)
            preview = prefix.with_suffix('.png')
            if result.returncode or not preview.is_file():
                raise RuntimeError('PDF preview failed for '+document['sourceLabel']+': '+result.stderr.strip())
            preview.chmod(0o600)
            file['previewPath'] = str(preview)
            file['previewMime'] = 'image/png'
            document['previewHref'] = '/career-files/'+document['id']+'?preview=1'
    if before != source_stats():
        raise RuntimeError('Source changed during export; rerun to take a consistent snapshot')
    (repo/'src/data/career-public.json').write_text(json.dumps(public,indent=2)+'\n')
    local_path.parent.mkdir(parents=True,exist_ok=True)
    local_path.write_text(json.dumps(local,indent=2)+'\n')
    local_path.chmod(0o600)
    assets=repo/'public/career'
    assets.mkdir(exist_ok=True)
    shutil.copy2(args.source/'resumes/resume-SEND-THIS.pdf',assets/'resume-SEND-THIS.pdf')
    shutil.copy2(args.source/'resumes/assets/resume-SEND-THIS.png',assets/'resume-SEND-THIS.png')
    print(json.dumps(dict(sourceFiles=len(local['files'])-1,documents=len(public['documents']),roles=len(public['roles']),localAppliedRecords=len(local['content']['applied']),folders=len(public['folders']),pdfs=sum(d['kind']=='pdf' for d in public['documents']))))

if __name__=='__main__': main()
