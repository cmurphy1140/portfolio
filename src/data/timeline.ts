/* The dated record behind /timeline and `cat experience`.

   Every entry is traced to Connor's résumé facts file (the approved wording
   behind public/Connor_Murphy_Resume.pdf); anything the facts file does not
   state is left out. Dates keep the resume's own precision: a
   month when the resume gives a month, a bare year when it gives only a year.
   Nothing is interpolated, so a year-only entry is drawn as the whole year and
   labelled as year precision rather than given an invented month.

   `slug` links an entry to its destination, and only a verified destination
   is linked. The timeline never introduces a URL of its own. */

export const timelineLanes = ["work", "projects", "education"] as const;

export type TimelineLane = (typeof timelineLanes)[number];

/** "YYYY-MM" for month precision, "YYYY" for year precision. */
export type TimelineDate = `${number}-${number}` | `${number}`;

export type TimelineEntry = {
  id: string;
  lane: TimelineLane;
  title: string;
  org: string;
  start: TimelineDate;
  /** Omitted for an ongoing entry; drawn up to TIMELINE_AS_OF. */
  end?: TimelineDate;
  /** A single dated event, such as a graduation, rather than a span. */
  milestone?: boolean;
  /** Only wording the résumé facts file states; omitted when it states none. */
  note?: string;
  slug?: string;
};

/** The date the record was last checked against the resume. No clock is read. */
export const TIMELINE_AS_OF = "2026-10";

export const TIMELINE_FIRST_YEAR = 2021;
export const TIMELINE_LAST_YEAR = 2026;

export const timeline: readonly TimelineEntry[] = [
  {
    id: "wibl",
    lane: "projects",
    title: "Wireless Inexpensive Bathymetry Logger (WIBL) — senior capstone",
    org: "University of New Hampshire, CS 791/792",
    start: "2021",
    end: "2022",
    note: "On a team moving a seafloor-mapping data pipeline onto AWS Lambda, Step Functions and S3, built the timestamp Lambda, the interpolation step and the deduplication step.",
  },
  {
    id: "liberty-mutual-2022",
    lane: "work",
    title: "Telematics backend development intern, full time",
    org: "Liberty Mutual",
    start: "2022-05",
    end: "2022-09",
    note: "Developed Java backend components on AWS Lambda for a telematics scoring pipeline; offered the TechStart full-time software engineer program.",
  },
  {
    id: "liberty-mutual-2023",
    lane: "work",
    title: "Telematics backend development intern, part time",
    org: "Liberty Mutual",
    start: "2023-05",
    end: "2023-09",
    note: "Second summer on the same telematics team.",
  },
  {
    id: "unh",
    lane: "education",
    title: "B.S. Computer Science",
    org: "University of New Hampshire",
    start: "2023-05",
    milestone: true,
    note: "Degree conferred May 2023.",
  },
  {
    id: "birches",
    lane: "work",
    title: "Birches Academy",
    org: "Salem, NH",
    start: "2024-09",
    end: "2025-10",
  },
  {
    id: "post-and-vine",
    lane: "work",
    title: "Post & Vine",
    org: "Vero Beach, FL",
    start: "2025-11",
    end: "2026-04",
  },
  {
    id: "sandridge",
    lane: "work",
    title: "Sandridge Golf Club",
    org: "Indian River County",
    start: "2026-04",
  },
  {
    id: "vero",
    lane: "projects",
    title: "Cyber-Physical System Assurance — home automation field study",
    org: "Independent",
    start: "2026",
    note: "Reverse-engineered a professionally installed home automation system's local interfaces; built a Swift client with 318 automated tests.",
    slug: "vero",
  },
];

/* ── date arithmetic, in fractional years ─────────────────── */

function parts(date: TimelineDate) {
  const [year, month] = date.split("-").map(Number);
  return { year, month: month as number | undefined };
}

/** Where an entry starts on the axis. A year-precision start is January. */
export function startValue(date: TimelineDate) {
  const { year, month } = parts(date);
  return year + (month ? (month - 1) / 12 : 0);
}

/** Where an entry ends. A month ends at its last day; a bare year at December. */
export function endValue(entry: TimelineEntry) {
  if (entry.milestone) return startValue(entry.start);
  const { year, month } = parts(entry.end ?? TIMELINE_AS_OF);
  return year + (month ? month / 12 : 1);
}

/** The right-hand edge of the record: the end of the TIMELINE_AS_OF month. */
export function asOfValue() {
  const { year, month } = parts(TIMELINE_AS_OF);
  return year + (month ?? 12) / 12;
}

export function isYearPrecision(entry: TimelineEntry) {
  return !entry.start.includes("-") || (entry.end !== undefined && !entry.end.includes("-"));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(date: TimelineDate) {
  const { year, month } = parts(date);
  return month ? `${MONTHS[month - 1]} ${year}` : String(year);
}

/** The date range exactly as the resume states it. */
export function formatRange(entry: TimelineEntry) {
  if (entry.milestone) return formatDate(entry.start);
  return `${formatDate(entry.start)} – ${entry.end ? formatDate(entry.end) : "present"}`;
}
