import Link from "next/link";
import type { Destination } from "@/data/destinations";
import styles from "./vero-case-study.module.css";

/* Highlighter composition adapted from https://instalanding.ai/p/highlighter-markup-page.txt
   Source: https://github.com/RayVelez27/instalanding.ai (MIT; see adjacent license). */
const evidenceLabels = ["Read before writing", "Separate fact from assumption", "Publish findings responsibly"];

function Marker({ children }: { children: string }) {
  return <span>{children.split(" ").map((word, index) => <span key={index}>{index > 0 ? " " : null}<mark className={styles.marker}>{word}</mark></span>)}</span>;
}

export default function VeroCaseStudy({ destination }: { destination: Destination }) {
  return (
    <main className={`doc ${styles.study}`}>
      <Link className="doc-back" href="/#work">← All work</Link>
      <header className={styles.head}>
        <p className="card-label"><span>{destination.shortTitle}</span><span>{destination.category}</span></p>
        <h1 className="doc-title doc-question">{destination.question ?? destination.title}</h1>
        <p className="doc-state"><span className="doc-state-name">{destination.state}</span>{" "}{destination.status}</p>
        <p className="doc-summary">{destination.summary}</p>
      </header>
      <section className={styles.section} aria-labelledby="evidence-title">
        <h2 id="evidence-title">Evidence</h2>
        <div className={styles.evidence}>
          {destination.evidence.map((item, index) => (
            <details className={styles.disclosure} key={item}>
              <summary><span className={styles.index} aria-hidden="true">0{index + 1}</span><Marker>{evidenceLabels[index]}</Marker></summary>
              <p>{item}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="correction-title">
        <h2 id="correction-title">Corrected</h2>
        <figure className={styles.correction}>
          <div className={styles.comparison}>
            <div><p className={styles.label}>Assumed</p><p className={styles.timing}>1.5 <span>seconds</span></p></div>
            <div><p className={styles.label}>Measured</p><p className={styles.timing}><Marker>0.15–0.41</Marker> <span>seconds</span></p><p className={styles.writes}>Twelve timed writes</p></div>
          </div>
          <figcaption>{destination.correction}</figcaption>
        </figure>
      </section>
      <section className={styles.section} aria-labelledby="learning-title">
        <h2 id="learning-title">What this taught</h2>
        <p className={styles.learning}>{destination.learning}</p>
      </section>
      {destination.tags ? <ul className={styles.tags} aria-label="Built with">{destination.tags.map(tag => <li key={tag}>{tag}</li>)}</ul> : null}
    </main>
  );
}
