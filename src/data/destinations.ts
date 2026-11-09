export const destinationKinds = [
  "repo",
  "deploy",
  "artifact",
  "case-study",
] as const;

export type DestinationKind = (typeof destinationKinds)[number];

/* The long form of a case study: the problem, what was built and by whom, the
   decisions and what broke, and the proof. Every line traces to a dated check
   in the project's vault note; notYet says what the page does not claim. */
export type CaseStudy = {
  problem: readonly string[];
  role: string;
  built: readonly string[];
  screenshots?: readonly { src: string; alt: string; width: number; height: number }[];
  decisions: readonly { title: string; body: string }[];
  proof: readonly { claim: string; detail: string; href?: string; hrefLabel?: string }[];
  notYet: string;
};

export type Destination = {
  slug: string;
  title: string;
  shortTitle: string;
  kind: DestinationKind;
  href: string;
  summary: string;
  status: string;
  evidence: readonly string[];
  learning: string;
  verified: boolean;
  /* Shown in the work-picker tab row. false keeps a destination reachable
     through ls/cat/open without competing for the first tabs a visitor sees. */
  primary: boolean;
  /* Public state and the question the project answered. status is the honest
     line beside the state; tags are the stack footnote. */
  state?: "Active" | "Parked" | "Released";
  question?: string;
  /* One number with proof one click away: proof is the evidence, not a claim. */
  number?: { value: string; label: string; proof: string; proofLabel: string };
  correction?: string;
  /* The mile-marker label on the home card: a plain category and the tools
     the entry's own evidence names. Nothing here goes beyond that evidence. */
  category?: string;
  tags?: readonly string[];
  study?: CaseStudy;
};

export const destinations = [
  {
    slug: "drive-score",
    title: "Drive Score — Understanding a Driving-Score Pipeline",
    shortTitle: "Drive Score",
    kind: "case-study",
    href: "/work/drive-score",
    summary: "A learning prototype that follows synthetic driving trips through a scoring pipeline, making an internship architecture understandable one layer at a time.",
    status: "Laptop scaffold recorded as built and tested in October 2026. The scorer remains a hands-on learning task.",
    question: "Can rebuilding a driving-score pipeline make each infrastructure layer understandable?",
    evidence: [
      "The source describes seeded synthetic trips, Kafka and Postgres as the starting architecture.",
      "The driving model is informed by observed scorecards; it is not an employer's private scoring formula.",
      "The scorer, further infrastructure stages, deployment and work with personal driving data remain planned or unverified.",
    ],
    learning: "Keep the input and scoring rule understandable, then compare what each infrastructure layer is responsible for. The next exercise is writing the scorer and observing its outputs.",
    verified: true,
    primary: false,
    category: "Learning prototype",
    tags: ["Python", "Kafka", "PostgreSQL"],
  },
  {
    slug: "evidence-room",
    title: "Evidence Room — A Game About Changing Your Mind",
    shortTitle: "Evidence Room",
    kind: "case-study",
    href: "/work/evidence-room",
    summary: "An investigation game built around fictional records, supported claims, and the moment new evidence changes the story.",
    status: "Phase 1 scaffold built. The validation rule is my exercise, and it is still open.",
    state: "Parked",
    question: "What does it take to change your mind when new evidence arrives?",
    evidence: [
      "The starter includes fictional records, citation selection, a claim notebook, and a revision flow.",
      "Diagrams of the player journey, the code flow and the learning roadmap pair with a deliberately unfinished evidence-validation exercise.",
      "Persistence, an API, a database, and case authoring are proposed later phases, not shipped features.",
    ],
    learning: "Build one understandable rule, follow its effect through the interface, then add the next layer. A working scaffold is the start of the learning, not proof that the exercise is finished.",
    verified: true,
    primary: true,
    category: "Learning game",
    tags: ["JavaScript", "Evidence", "Learning by building"],
  },
  {
    slug: "interview-gym-coach",
    title: "Interview Gym Coach — Live Practice Board and Mock-Interview Runner",
    shortTitle: "Interview Gym Coach",
    kind: "case-study",
    href: "/work/interview-gym-coach",
    summary:
      "A local web companion for my private interview-practice repository. A live board shows each practice problem's status from its real tests, and a mock-interview runner times the 45-minute loop from the gym's curriculum. Claude Code agents built it; I designed the gym, set the mission and use the tool.",
    status: "Shipped October 2026. A later docs move broke the mock runner's curriculum path.",
    state: "Active",
    question: "How do I practise for interviews against real tests and a real clock?",
    evidence: [
      "Re-runs a problem's tests whenever a file is saved and pushes the new status to the page over server-sent events. The board never shows test code or answers.",
      "The mock-interview runner times the 45-minute loop from the gym's curriculum, with interviewer cues and green/amber/red grading.",
      "Python tests and headless UI checks, plus five independent reviews; every must-fix finding was fixed before it shipped.",
      "Authorship, plainly: agents chose, built, reviewed and documented the coach in one day. I directed the work and am the one practising with it.",
    ],
    learning:
      "Running someone's tests on every save means owning the processes you start: each run gets its own process group and a timeout, so a hung test cannot hold the board. Results are cached by content hash so an unchanged file is not re-run, and the page receives updates over server-sent events instead of polling. Reporting pass counts rather than test names keeps the board from spoiling the exercises it tracks.",
    verified: true,
    primary: true,
    category: "Tool",
    tags: ["Python", "Server-sent events"],
  },
  {
    slug: "vero",
    title: "Vero — System Assurance Field Study",
    shortTitle: "Vero",
    kind: "case-study",
    href: "/work/vero",
    summary:
      "A safety-bounded reverse-engineering study of a professionally installed home automation system.",
    status: "Ongoing engineering study.",
    state: "Active",
    question: "What is the automation system in my house actually doing, and can software act on it without guessing?",
    correction: "The simulated house first assumed a light takes 1.5 seconds to settle at a new level. Twelve timed writes on the real house showed it within 0.15 to 0.41 seconds.",
    evidence: [
      "Built repeatable instrumentation that read the house before changing anything and confirms every write by reading it back.",
      "Separated measured behavior, inference, and assumption in the written record.",
      "Documented security findings without publishing household identifiers or raw device data.",
    ],
    learning:
      "A measuring tool is part of the evidence chain: subtle instrumentation errors create confident but incorrect conclusions.",
    verified: true,
    primary: true,
    category: "Field study",
    tags: ["Swift", "WebSockets", "Instrumentation"],
    study: {
      problem: [
        "The house I live in runs a professionally installed home automation system: lighting, shades, climate, audio and video, and scenes. Installers set it up. I live with it every day, but nothing written said what it actually does, and it was never built for software to drive.",
        "AI agents are starting to act on real things, and a home is the hard case because people live in it. The danger is not only a bad change but a wrong report. A command the system accepted is a receipt, not proof that the light moved, and an agent that trusts the receipt retries or tells a person something false.",
      ],
      role:
        "Built with Claude Code agents under my direction, in the house I live in. The written record labels every finding as measured on the house, published by the vendor or inferred, and keeps four of its own wrong conclusions on file.",
      built: [
        "Read-only instrumentation first, on a known network with the homeowner's knowledge. It subscribes to the system's live state feed and records what changes. No write path existed until the reading was understood.",
        "A guarded write path for four allow-listed lights. Each request is checked, the light is read first, the change is sent once, and the light is read back until it settles.",
        "Exactly one of four outcomes for every attempt: confirmed, unconfirmed, failed or refused, each with its reason.",
        "A fake house calibrated from 37 recorded real writes, so every test and the demo run without touching the real one.",
        "A Swift package with no dependencies: the VeroCore runtime and a vero command-line tool, tested with XCTest.",
      ],
      decisions: [
        {
          title: "Accepted is not done",
          body: "The system answers a write before the light has moved, so Vero never treats that answer as success. It reads the light back, and when the reading can't prove the result it says unconfirmed, which tells the caller not to retry blindly.",
        },
        {
          title: "Call it failed only with proof",
          body: "A probe found that an unrecognized write error was reported as failed with zero writes, while the light had in fact moved to the requested level. Now failed requires an error that proves the write never got through; any other error is read back and never retried. Five new tests failed on the old code before the fix, then passed.",
        },
        {
          title: "Refuse when the map is out of date",
          body: "Before any write, Vero reads the light's binding from the system and compares it with its saved model. If the installation was reconfigured since, the request is refused before anything is sent.",
        },
        {
          title: "Tests never touch the house",
          body: "Vero reaches a house only through one three-call seam: read a state, set a level, read a binding. A fake adapter fills that seam in every test and in the demo, which prints each of the four outcomes once.",
        },
        {
          title: "The live feed speeds up checking, not sending",
          body: "Pushed updates tell Vero sooner that a light moved, with polling as the fallback. Plain HTTP stays the only way a change is sent, because writes over the socket were never tested.",
        },
      ],
      proof: [
        {
          claim: "24 live writes, 0 failed",
          detail: "On 4 October 2026, on the four allow-listed lights, with the homeowner home and watching. Every light read back at its starting level afterwards.",
        },
        {
          claim: "1,618 of 1,632",
          detail: "Apparent changes in one full sweep of the state feed that were only the same value restated in another JSON type. Vero compares states by meaning, not by type.",
        },
        {
          claim: "522 private terms, 0 hits",
          detail: "A privacy scan searches every file and the whole history of the public-safe core for house names, identifiers, rooms and addresses.",
        },
      ],
      notYet:
        "The repository is private, so this page shows no test count. Vero does not undo a change: its first reading is an audit record, and putting a light back belongs to another layer. The settle timing rests on twelve timed writes.",
    },
  },
  {
    slug: "itinerary-control",
    title: "Trip Proposal Change Control",
    shortTitle: "Proposal Control",
    kind: "case-study",
    href: "/work/itinerary-control",
    summary:
      "A tool for a student travel company that turns a trip record into its printed Word proposal, then turns a director's revision into the reprinted proposal and a paper trail of what changed.",
    status: "Working tool, 2026. The client's first review comes next.",
    state: "Active",
    question: "Could a director's change reprint the whole proposal without anyone retyping it?",
    evidence: [
      "Renders a trip record into the client's own printed layout: cover, day-by-day schedule, inclusions and exclusions, and a price table.",
      "One command takes a director's revised trip and produces the revised proposal, a change summary that separates material changes (venues, times, prices, inclusions) from wording-only edits, and an internal vendor call list.",
      "Rebuilding the same trip record produces the identical file, and tests cover the proposal, the revision command and the change classification. Client output stays out of git, except one demo trip committed with the client's OK.",
      "Each revision also runs a consistency check on the trip data, catching problems like two stops booked at the same time or a supplier named differently in two places, before anything reaches the client.",
    ],
    learning:
      "Reading and writing the same trip record everywhere meant a fact fixed once showed up correctly in the proposal, the change summary, and the vendor list, instead of needing to be retyped into a second source for the Word document.",
    verified: true,
    primary: true,
    category: "Tool",
    tags: ["Word output"],
    study: {
      problem: [
        "A student travel company sends each band director a printed Word proposal: a cover, a day-by-day schedule, what is and isn't included, and a price table. When a director changes the plan, someone retypes the proposal.",
        "Retyping drifts. Two printings of the same trip disagreed on the performance venue, a vendor's name and every cell of the price table, and nothing said which differences mattered or which vendors needed a call.",
      ],
      role:
        "Client work, built with Claude Code agents under my direction: 98 of the repository's 154 commits carry a Co-Authored-By: Claude trailer. I brought in the company's documents and printed proposals, worked the output toward them in rounds, and own what goes to the client.",
      built: [
        "One JSON trip record that holds every fact about a trip. Eight renderers build the itinerary, vendor sheet, run sheet, deadline calendar, price table, change summary, consistency audit and library coverage from it.",
        "A Word builder that prints the record in the company's own proposal layout, as an editable .docx.",
        "One revise command. Given a director's revised record, it produces the reprinted proposal, a change summary that separates material changes from wording, and an internal list of which vendors to call.",
        "A consistency audit on every revision, which catches problems like two stops booked at the same time before anything reaches the client.",
      ],
      decisions: [
        {
          title: "The record is the database",
          body: "Every document reads the same trip record, and a revised record names the one it replaces. A change is made once and diffed, instead of retyped into a second copy for the Word file.",
        },
        {
          title: "Print no internal notes at all",
          body: "A filter meant to keep staff notes off the client's proposal still let two through. The clever filter gave way to a flat rule: the proposal prints no slot notes, as the company's own proposals carry none. A test checks that every note in the record is absent from the printed documents.",
        },
        {
          title: "Same record, same bytes",
          body: "Building the same trip twice gave two different files, because the Word library stamps the current time into the document. The build now uses the record's own prepared date, and a test checks that two builds are byte-identical, so any difference in the output is a real change.",
        },
        {
          title: "Times are numbers, not text",
          body: "The schedule-order check compared times as strings, and as text \"9:30\" sorts after \"10:00\", so the check was silently backwards. Times are now 24-hour and compared in minutes, with a test named for the bug.",
        },
        {
          title: "Flag the facts, don't settle them",
          body: "The tool lists contradictions and open questions; it does not resolve them. A fact only the client or a vendor can answer goes back to them as a question, and nothing in the tool contacts a vendor, director or school.",
        },
      ],
      proof: [
        {
          claim: "18 material, 25 wording-only",
          detail: "Between the demo trip's first proposal and its revision, the change summary found 18 material changes, 11 of them price cells, and 25 wording-only edits, all computed from the two records.",
        },
        {
          claim: "Byte-identical rebuilds",
          detail: "Two builds of the same trip produce the same file, checked by a test on every run of the repository's one check command.",
        },
        {
          claim: "Private stays private",
          detail: "Client output stays out of git, except one demo trip committed with the client's OK. A guard scans the trip layer for personal names, mailboxes and direct phone numbers.",
        },
      ],
      notYet:
        "The client's first review of a revised proposal is still to come, so whether it saves their staff time is untested, and the printed layout still needs their eye. The code is private client work, so this page links none of it.",
    },
  },
  {
    slug: "tracker-digest",
    title: "tracker-digest — Job-Application Follow-up Digest",
    shortTitle: "tracker-digest",
    kind: "case-study",
    href: "/work/tracker-digest",
    summary:
      "A Python command-line tool, standard library only in its core, that reads a job-application tracker CSV, finds applications with no reply for seven or more days, and drafts a digest of them.",
    status: "v0.1.0, October 2026. Complete.",
    state: "Released",
    question: "Which of my job applications have gone quiet?",
    number: { value: "33", label: "tests", proof: "https://github.com/cmurphy1140/job-tracker/actions/workflows/tests.yml?query=branch%3Amain", proofLabel: "CI runs on GitHub" },
    correction: "This page said 20 tests pin the quiet rule. The public suite has 9 for that rule and 33 in all.",
    evidence: [
      "Keeps the rule for what counts as gone quiet in one function, with 9 tests pinning the behavior.",
      "Reports rows with unreadable or missing dates under a Needs fixing section with their CSV line numbers, instead of dropping them.",
      "Puts a human review step before any stale application reaches the digest, and logs each approve or reject decision.",
    ],
    learning:
      "A deliberate edge-case pass found that a blank line in the CSV shifted the reported line number for a bad row, because the code assumed row index plus two instead of asking the CSV reader for its own line count. A test that failed on the old code and passed on the fix pinned the correction.",
    verified: true,
    primary: true,
    category: "Tool",
    tags: ["Python", "Standard library", "CLI"],
  },
  {
    slug: "mac-hardening",
    title: "Mac Hardening and Automation",
    shortTitle: "Mac Hardening",
    kind: "case-study",
    href: "/work/mac-hardening",
    summary:
      "Audited and cleaned a macOS system end to end, then scripted its weekly maintenance.",
    status: "Cleanup complete, 2026. Removing the old Intel Homebrew waited on a one-week soak.",
    state: "Released",
    question: "What is actually running on this Mac, and what can safely go?",
    evidence: [
      "Removed 34 third-party launch items, 27 of them orphaned by uninstalled software.",
      "Migrated Homebrew to its native arm64 install.",
      "Reclaimed 89 GiB of storage.",
      "Scripted weekly maintenance with launchd.",
    ],
    learning:
      "Cleaning up a machine starts with measuring it: I inventoried every startup item and gigabyte before removing anything, so each change could be explained and undone.",
    verified: true,
    primary: true,
    category: "Systems",
    tags: ["macOS", "launchd", "Homebrew"],
  },
  {
    slug: "catch-5",
    title: "Catch 5 — iOS Card Game and Learning App",
    shortTitle: "Catch 5",
    kind: "case-study",
    href: "/work/catch-5",
    summary:
      "A Swift and SwiftUI app for playing and learning Catch 5: a standalone rules engine, computer opponents, interactive tutorials, strategy explanations, and save and resume.",
    status: "Development closed; the family plays it.",
    state: "Parked",
    question: "Could my grandmother's card game live on a phone, and teach someone new to play it?",
    number: { value: "264", label: "tests", proof: "https://github.com/cmurphy1140/catch-5/actions/workflows/tests.yml?query=branch%3Amain", proofLabel: "CI runs on GitHub" },
    evidence: [
      "Standalone rules engine separated from the app UI.",
      "Computer opponents for solo play.",
      "Interactive tutorials and strategy explanations for learning the game.",
      "Save/resume functionality.",
    ],
    learning:
      "Separating the rules engine from the interface let the same game logic drive both play and the interactive rule trials, instead of duplicating rules in each.",
    verified: true,
    primary: true,
    category: "App",
    tags: ["Swift", "SwiftUI"],
    study: {
      problem: [
        "Catch 5 is my family's card game: Pitch with Fives, two partnerships, first to 25, with the family's own house rules, like a 9-and-out bid the dealer may not match. It came down from my grandmother, and it lives in the heads of the people at the table.",
        "Someone new to the family was learning it. At a real table that means four people telling you what to play. I wanted a patient table instead: one that works offline at any hour, lets you take a move back, and explains why a card was right or wrong.",
        "That set the engineering problem. A phone can close the app mid-hand, three computer players must never peek at hidden cards, and every explanation has to match the play it explains.",
      ],
      role:
        "Built with Claude Code agents under my direction: 101 of the 133 commits carry a Co-Authored-By: Claude trailer. I set the house rules, played it at the family table and in narrated play-throughs, and turned what I saw into fixes. I keep a numbered log of more than 100 design decisions and why each was made.",
      built: [
        "A rules engine with no UI code: dealing, bidding, tricks, scoring, computer players and saving. It imports only the Swift standard library and Foundation, so its tests run on a Mac without a simulator.",
        "A SwiftUI iPhone app on top, in MVVM. Views talk only to one view model, and that view model is the only UI type that touches the engine.",
        "Three computer seats on Easy or Standard, or pass-and-play on one phone.",
        "Hints, a hand review that explains every play, undo, save and resume, and How to play lessons and rule trials that run on the same engine as the game.",
        "A Swift package with no third-party dependencies, for iOS 17+ and macOS 14+.",
      ],
      screenshots: [
        { src: "/work/catch-5/home.png", alt: "Catch 5 home screen", width: 598, height: 1300 },
        { src: "/work/catch-5/bidding.png", alt: "The bidding row, with numbers the auction has passed greyed out", width: 598, height: 1300 },
        { src: "/work/catch-5/table.png", alt: "Playing a trick at the table", width: 598, height: 1300 },
        { src: "/work/catch-5/result.png", alt: "The hand result sheet", width: 598, height: 1300 },
      ],
      decisions: [
        {
          title: "A save is a replay log, not a snapshot",
          body: "A save holds the shuffled deck, the dealer and every accepted move. Opening the app replays each move through the same rule methods a tap uses, so a resumed game can't show a position the rules would not allow. Undo is the same replay, one move shorter. The cost showed up when a new trump-opening rule arrived: an old game that broke it fails replay, so it is set aside instead of loaded, and every save carries a version.",
        },
        {
          title: "The computers can't see hidden cards",
          body: "A computer seat gets a PlayerView: its own cards plus public facts, with no field for anyone else's hand. Its choice goes through the same checked apply as a human tap. A test swaps a hidden opponent card for one from the stock and checks that the decision does not change.",
        },
        {
          title: "Explanations come from the code that plays",
          body: "The Standard player's move and its reason come out of one strategy function, so a hint can't drift from the play. Legal cards are sorted into a fixed order first, so the way a hand happens to be arranged can't change the answer. A test replays a whole match and checks every explanation against the card actually played.",
        },
        {
          title: "Measure the bidding, then change it",
          body: "At the table the computers kept opening strong hands too low. Three fixes to the point arithmetic moved the benchmark by noise or not at all, so the bidding switched to the family's own floors for each suit shape. The cost, more contracts played and more of them missed, is recorded beside the gain.",
        },
        {
          title: "A pause that didn't hold",
          body: "A computer could play while a menu covered the table, because a turn that was already waiting woke up and acted. Every cover now folds into one paused flag that is part of the turn task's identity, so opening a cover cancels the task instead of asking it to check. A test holds the pause while any cover remains.",
        },
      ],
      proof: [
        {
          claim: "264 tests, 0 failures",
          detail: "93 on the rules engine and 171 on the view model, all in Swift Testing. GitHub runs them on every push to main.",
          href: "https://github.com/cmurphy1140/catch-5/actions/workflows/tests.yml?query=branch%3Amain",
          hrefLabel: "CI runs on GitHub",
        },
        {
          claim: "Win rate 0.647 to 0.675",
          detail: "The new bidding against a frozen copy of the old computer player, in a mirrored benchmark that swaps the hands between partnerships to cancel out luck. A second seed range went from 0.625 to 0.653, and underbids against the floors fell from 481 to 84. A re-run on 12 October 2026 reproduced the 0.647 baseline exactly.",
        },
        {
          claim: "Public code",
          detail: "The repository, the house rules and these screenshots are public.",
          href: "https://github.com/cmurphy1140/catch-5",
          hrefLabel: "github.com/cmurphy1140/catch-5",
        },
      ],
      notYet:
        "It is not on the App Store; the family plays it, and product work is parked. Nothing yet measures how well a new player learns from it, and the win rate is a benchmark against the earlier computer player, not against people.",
    },
  },
  {
    slug: "band-charter-outreach",
    title: "Customer Outreach Pipeline",
    shortTitle: "Outreach Pipeline",
    kind: "case-study",
    href: "/work/band-charter-outreach",
    summary:
      "A Python lead finder for a student travel client: it reads public parade and band pages, merges the schools they name, and scores each one into a tier.",
    status: "2026",
    question: "Which schools have band programs that travel, and who should hear from us first?",
    evidence: [
      "Reads public parade and band pages, then merges and dedupes the schools they name.",
      "Enriches each school from its own website, scores it 0 to 100 and assigns an A, B or C tier.",
      "Writes a spreadsheet with Tier A, Tier B, East Coast and All sheets.",
    ],
    learning:
      "Turning a manual outreach list into a scored, tiered spreadsheet made it possible to prioritize leads instead of working the list by hand.",
    verified: false,
    /* Thinnest evidence, no test count, no shipped status: kept reachable via
       ls/cat/open, not shown in the tab row (docs/home-page-proposal.md). */
    primary: false,
  },
  {
    slug: "timeline",
    title: "Timeline — work, projects and education by date",
    shortTitle: "Timeline",
    kind: "artifact",
    href: "/timeline",
    summary:
      "Every dated entry from the verified resume on one axis, from the senior capstone in 2021 to the work in progress now.",
    status: "Dated from the verified resume",
    evidence: [
      "Each entry keeps the resume's own precision: a month where the resume gives a month, a whole year where it gives only a year.",
      "Projects on the timeline link to their case study only when that destination is verified.",
      "The same record prints in the terminal as cat experience.",
    ],
    learning:
      "Drawing the record to scale meant keeping each date exactly as precise as its source. Widening an entry to look tidier would be a claim the resume does not make.",
    verified: true,
    primary: true,
  },
  {
    slug: "resume",
    title: "Resume",
    shortTitle: "Resume",
    kind: "artifact",
    href: "/resume",
    summary:
      "A concise view of experience, systems work, and the evidence behind each project claim.",
    status: "Web index and verified PDF available",
    evidence: [
      "Project claims link back to inspectable work.",
      "Skills are grounded in the systems used to produce the work.",
    ],
    learning:
      "A portfolio is strongest when the resume is an index into evidence rather than a separate set of claims.",
    verified: true,
    primary: true,
  },
] as const satisfies readonly Destination[];

export function findDestination(slug: string) {
  return destinations.find((destination) => destination.slug === slug);
}

/* The folder inventory changes with the Career source; route construction stays
   here alongside every other navigation destination. */
export function buildCareerNavigation(folders: readonly {id:string;title:string;parentId?:string}[]) {
  return folders.filter(folder=>folder.id !== 'root').map(folder=>({
    id: folder.id, title: folder.title, parentId: folder.parentId,
    href: `/career/${folder.id}`,
  }));
}
