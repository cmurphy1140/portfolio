export const destinationKinds = [
  "repo",
  "deploy",
  "artifact",
  "case-study",
] as const;

export type DestinationKind = (typeof destinationKinds)[number];

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
