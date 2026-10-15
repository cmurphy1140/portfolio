# portfolio

Connor Murphy's portfolio site: a job-search spreadsheet of roles with Apply links, plus a Resume page with projects and downloads, live on Vercel.

**Serves:** career · codename **Capri** (Campanian Archipelago) · live at https://personal-os-weld-beta.vercel.app · vault note [Projects/active/portfolio/portfolio](obsidian://open?vault=Archipelago&file=Projects%2Factive%2Fportfolio%2Fportfolio)

**Status:** stage **parked**, live on Vercel. Checked 2026-10-15: Node tests 51 passed, 0 failed; build ok; 1 image reference resolves; site states match the vault.

**Run:** `scripts/check.sh` (once: `npm ci`). CI runs the same command on every push.

**Start here:** [`AGENTS.md`](AGENTS.md), the public boundary and working rules for the site.

**Map**

```
src/app/         Next.js routes: home, career, resume, timeline, work case studies
src/components/  the career fieldbook and page components
src/data/        destinations.ts, the only source of navigation destinations
public/career/   publishable résumé, cover letter, logos, tracker and images
scripts/         check.sh, destination, privacy, image and vault checks, career export
tests/           node --test suites
```

## What this is not

- Not a deployment tool. Nothing here deploys; shipping to Vercel is a separate, authorized step.
- Not a home for private material. No local paths, house or device data, or private employer and customer material.
- Not the written record. Plans, audits and progress live in the vault; `STATE.md` points there.

## Principles

1. **Read first.** Understand what exists before changing it. The record of how it was learned is part of the product.
2. **Every claim carries its check.** Checked, Recorded or UNTESTED. A note is never the proof for a later claim.
3. **Corrections stay on the record.** A wrong finding is corrected in place with the date, never erased.
4. **Private stays private.** Raw data, people, addresses, device maps and client material never enter the repo. Only facts come in, plus documents the client already hands out.
5. **Say what it is not.** Scope is written down so nobody builds the wrong thing.
6. **One place for status.** The vault note. The repo points to it.

## What is here

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
