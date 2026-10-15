<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Personal OS

## Purpose

This is Connor Murphy's public portfolio and resume site. It reuses the visual
grammar of Vero's private probe console, but it is a separate project with no
Vero house data, device data, or private filesystem access.

The terminal is a real portfolio navigator, not a simulated operating-system
shell. Every successful `open <slug>` resolves through one allowlisted manifest
entry to a real repository, deployed app/site, downloadable artifact, or public
case study. Arbitrary commands, paths, and URLs must fail closed.

## Aesthetic North Star

The living project journal (October 2026) evolves “A Different Road.” Connor's
name and current direction come first. Keep the asphalt/amber palette, Geist
Sans narrative, Geist Mono controls, light/dark themes, and dated road record.
See `docs/living-journal-design.md` for the design rationale.

- A large name and short introduction lead into the current learning project.
- An on-demand, silent Remotion story demonstrates evidence and revision.
  Never autoplay; reduced motion uses static, selectable chapters and a transcript.
- Project rows expose real status, searchable tools, expandable learning notes,
  and manifest-backed case studies. Unverified work remains unlinked.
- The allowlisted terminal is optional, behind Jump to and the keyboard shortcut.
- State filters describe editorial project status, not live telemetry.
- Preserve keyboard focus, semantic HTML, ordinary mobile taps, and no horizontal
  overflow at 390px. Do not copy private project notes or local assets wholesale.

## Public Boundary

Public content may include approved resume facts, public repository/deployment
URLs, sanitized case studies, screenshots created for publication, and learning
notes. Never publish local paths, IP addresses, hostnames, room names, device
maps, raw scans, household identifiers, customer identifiers, private employer
material, secrets, or unverified claims.

Do not copy `web/assets/keypads.webp` or any house-specific Vero content. Link to
approved public Vero material only.

## Working Rules

- `src/data/destinations.ts` is the only source of navigation destinations.
- The terminal accepts only the closed command set documented in the design.
- A destination is publishable only when its route or public URL passes the
  verification script.
- Do not deploy, create a remote, commit, or push without Connor's authorization.
- Run `scripts/check.sh` (lint, tests, build, privacy, images) before any
  completion claim.

## Current Status

2026-09-26: the "A Different Road" redesign replaced the split-plane layout
(see Aesthetic North Star and docs/design.md).

2026-09-20: the split-plane Personal OS Shell, closed command engine, typed
destination manifest, internal case-study and resume routes, public-output
privacy gate, and isolated mobile/desktop browser checks are implemented and
verified locally. Vero's public GitHub repository is the first verified external
destination. The verified one-page resume PDF includes the flagship Vero
project and is available from the resume route.
