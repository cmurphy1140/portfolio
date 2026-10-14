# Career fieldbook

Connor Murphy's portfolio follows the Career folders from his Obsidian vault.
Start with seven connected walkthrough chapters, inspect the receipts alongside
each claim, then explore the applications and documents behind the work.

## What works

- The folder rail reaches résumés, cover letters, preparation, history, and review drafts, including their assets and tailored subfolders.
- Search and preparation filters navigate the 23-role shortlist. Submission history keeps source-recorded status separate from confirmed evidence.
- Document readers, previews and downloads use the current source inventory.
- The public showcase includes selected safe documents; the complete local edition reads an external manifest at runtime.
- Project case studies and the experience timeline remain reachable. The optional closed command navigator is retained on legacy pages.

## Local verification

```bash
npm run verify
npm start -- --hostname 127.0.0.1 --port 4174
npm run test:ui
```

The UI test expects the production server at `http://127.0.0.1:4174` unless
`PERSONAL_OS_URL` is set.

## Boundaries

The project is separate from Vero. It must never contain raw house evidence,
local paths, network details, device maps, household identifiers, or private
customer/employer material. See `AGENTS.md` and `docs/design.md` before editing.

## Career fieldbook

The home page follows the Career walkthrough. The folder rail opens résumés,
letters, application preparation, recorded history, review drafts, and their
source documents. All seven chapters have contextual receipts. The existing
project case studies and experience timeline remain available.

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 4174
```

Open `http://127.0.0.1:4174`. The default showcase edition uses the public-safe
snapshot. Preparation states describe the workbook; they do not establish a
live posting or a submitted application.

For the complete local edition, first use `npm run career:sync -- --help`
to see export inputs, then launch with `CAREER_LOCAL_MODE=1` and
`CAREER_LOCAL_DATA=/absolute/path/to/career-local.json`. Never put the local
manifest or its source material in `public/` or a deployment bundle.

For Vercel, import this Next.js repository, use `npm run build`, and keep
`CAREER_LOCAL_MODE` and `CAREER_LOCAL_DATA` unset. The public edition serves the
selected résumé and safe source summaries; private documents stay local.
No deployment is created by these instructions.

Run `npm run test:ui` against the public production server. Set
`CAREER_UI_MODE=local` when testing the complete local edition.
