"use client";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { destinations, type Destination } from "@/data/destinations";
export const projects: readonly Destination[] = destinations.filter((destination) => destination.kind === "case-study" && destination.primary);
export function mileLabel(slug: string) {
  const project = projects.find(project => project.slug === slug);
  return project ? [project.category, project.tags?.[0]].filter(Boolean).join(" / ") : null;
}
const stateOrder = ["Active", "Parked", "Released"] as const;
const states = ["All", ...stateOrder.filter(item => projects.some(project => project.state === item))];
export default function WorkPane({ execute }: { execute: (command: string) => void }) {
  const [state, setState] = useState<string>("All");
  const [query, setQuery] = useState("");
  const shown = projects.filter(project => (state === "All" || project.state === state) && `${project.title} ${project.question} ${project.summary} ${project.tags?.join(" ")}`.toLowerCase().includes(query.toLowerCase().trim()));
  const onOpen = (slug: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); execute(`open ${slug}`);
  };
  return <section className="work journal-work" id="work" aria-labelledby="work-title">
    <div className="work-intro"><h2 id="work-title">A few things<br />I’m working through.</h2><p>Some shipped. Some still taking shape.<br />Each one leaves me with a better question.</p></div>
    <div className="work-controls"><div className="phase-filters" aria-label="Filter projects by state">{states.map(item => <button key={item} aria-pressed={state === item} onClick={() => setState(item)}>{item}</button>)}</div><label className="project-search"><span className="sr-only">Search projects</span><input type="search" placeholder="Find a project or tool" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    <p className="result-count" role="status">{shown.length} {shown.length === 1 ? "project" : "projects"}{state !== "All" ? ` / ${state.toLowerCase()}` : " / all states"}</p>
    <ul className="project-index">{shown.map(project => <li key={project.slug}><article className="project-row">
      <div className="project-meta"><span className="project-state">{project.state}</span><span>{project.category}</span></div>
      <div className="project-body"><p className="project-name">{project.verified ? <Link href={project.href} onClick={onOpen(project.slug)}>{project.shortTitle}</Link> : project.shortTitle}</p><h3>{project.question}</h3><p>{project.summary}</p><p className="project-status">{project.status}</p>
      {project.number && <p className="project-number"><strong>{project.number.value}</strong> {project.number.label} · <a href={project.number.proof}>{project.number.proofLabel}</a></p>}
      {project.tags && <p className="project-stack">Built with {project.tags.join(" · ")}</p>}
      <details className="project-learning"><summary>What I’m learning</summary><p>{project.learning}</p></details></div>
      <div className="project-action">{project.verified ? <Link href={project.href} onClick={onOpen(project.slug)} aria-label={`Read ${project.shortTitle} case study`}>Read the story <span aria-hidden="true">↗</span></Link> : <span>Case study forthcoming</span>}</div>
    </article></li>)}</ul>
    {shown.length === 0 && <div className="empty-projects"><h3>No projects match that combination.</h3><p>Try another word, or return to the full collection.</p><button className="button" onClick={() => { setQuery(""); setState("All"); }}>Show all projects</button></div>}
  </section>;
}
