"use client";

import { Fragment, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Destination } from "@/data/destinations";
import "./vero-design/upstream.css";
import styles from "./vero-case-study.module.css";

/* Pinned InstaLanding configuration + Christian Alder's actual highlighter.
   Exact imports and permitted adapters: vero-design/provenance.json.
   https://codepen.io/HejChristian/pen/NPbBeqO (MIT; adjacent license). */
const evidenceLabels = ["Read before writing and confirm every write", "Separate measured behavior from inference and assumption", "Document findings without publishing private data"];

function Marker({ children }: { children: string }) {
  const words = children.split(/\s+/).filter(Boolean);
  return <mark data-split>{words.map((word, index) => <Fragment key={index}><mark className={`w${index === words.length - 1 ? " last" : ""}`}>{word}</mark>{index < words.length - 1 ? " " : null}</Fragment>)}</mark>;
}

export default function VeroCaseStudy({ destination }: { destination: Destination }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div style={{ "--vero-ink": "var(--ink)" } as CSSProperties}><main className={`doc vero-import ${styles.study}`}>
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}><defs>
        <filter id="vero-rough"><feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="4" /><feDisplacementMap in="SourceGraphic" scale="5" /></filter>
        <filter id="vero-paper"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="5" stitchTiles="stitch" result="noise" /><feDiffuseLighting in="noise" lightingColor="white" surfaceScale="3"><feDistantLight azimuth="30" elevation="60" /></feDiffuseLighting></filter>
      </defs></svg>
      <Link className="doc-back" href="/#work">← All work</Link>
      <header>
        <p className="card-label"><span>{destination.shortTitle}</span><span>{destination.category}</span></p>
        <h1 className="doc-title doc-question">{destination.question ?? destination.title}</h1>
        <p className="doc-state"><span className="doc-state-name">{destination.state}</span>{" "}{destination.status}</p>
        <p className="doc-summary">{destination.summary}</p>
      </header>
      <section className="doc-section" aria-labelledby="evidence-title">
        <div className="sheet paper">
          <div className="sheet-head"><h2 id="evidence-title">Evidence</h2><span className="label">Select a claim</span></div>
          <div className="sheet-body">{evidenceLabels.map((label, index) => <p key={label}><button className="claim" type="button" aria-expanded={active === index} aria-controls="vero-note" onClick={() => setActive(active === index ? null : index)}><Marker>{label}</Marker></button></p>)}</div>
          <div id="vero-note" className="note" hidden={active === null} aria-live="polite"><span className="who">Evidence</span><p>{active === null ? "" : destination.evidence[active]}</p></div>
          <noscript><div className="note"><span className="who">Evidence</span>{destination.evidence.map(item => <p key={item}>{item}</p>)}</div></noscript>
        </div>
      </section>
      <section className="doc-section" aria-labelledby="correction-title">
        <h2 id="correction-title">Corrected</h2>
        <figure>
          <div className="figures"><div className="fig"><b>1.5</b><span>seconds · assumed</span></div><div className="fig"><b>0.15–0.41</b><span>seconds · measured<br />Twelve timed writes</span></div></div>
          <figcaption className={styles.context}>{destination.correction}</figcaption>
        </figure>
      </section>
      <section className="doc-section" aria-labelledby="learning-title"><h2 id="learning-title">What this taught</h2><p className="learning">{destination.learning}</p></section>
      {destination.tags ? <p className="doc-stack">Built with {destination.tags.join(" · ")}</p> : null}
      <p className={styles.credit}>Highlighter effect adapted from a pen by <a href="https://codepen.io/HejChristian/pen/NPbBeqO">Christian Alder</a>, via <a href="https://instalanding.ai/prompt/highlighter-markup-page">InstaLanding</a>. <a href="/licenses/instalanding-highlighter.txt">MIT licenses</a>.</p>
    </main></div>
  );
}
