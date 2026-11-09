import Image from "next/image";
import type { CaseStudy } from "@/data/destinations";
import styles from "./case-study.module.css";

/* The long form of a case study, in two halves so the Vero page can keep its
   own evidence sheet between them: the story (problem, what was built,
   decisions) and the proof (proof, what the page does not claim). */

export function CaseStudyStory({ study }: { study: CaseStudy }) {
  return (
    <>
      <section className="doc-section" aria-labelledby="problem-title">
        <h2 id="problem-title">The problem</h2>
        {study.problem.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>
      <section className="doc-section" aria-labelledby="built-title">
        <h2 id="built-title">What I built</h2>
        <ul className="evidence">{study.built.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className={styles.role}>{study.role}</p>
      </section>
      {study.screenshots ? (
        <section className="doc-section" aria-label="Screenshots">
          <ul className={styles.shots}>
            {study.screenshots.map((shot) => (
              <li key={shot.src}><Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(max-width: 700px) 45vw, 190px" /></li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="doc-section" aria-labelledby="decisions-title">
        <h2 id="decisions-title">Decisions, and what broke</h2>
        <ol className={styles.decisions}>
          {study.decisions.map((decision) => (
            <li key={decision.title}><h3>{decision.title}</h3><p>{decision.body}</p></li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function CaseStudyProof({ study }: { study: CaseStudy }) {
  return (
    <>
      <section className="doc-section" aria-labelledby="proof-title">
        <h2 id="proof-title">Proof</h2>
        <dl className={styles.proof}>
          {study.proof.map((item) => (
            <div key={item.claim}>
              <dt>{item.claim}</dt>
              <dd>{item.detail}{item.href ? <> <a href={item.href}>{item.hrefLabel ?? item.href}</a></> : null}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="doc-section" aria-labelledby="not-yet-title">
        <h2 id="not-yet-title">Not shown yet</h2>
        <p className="doc-correction">{study.notYet}</p>
      </section>
    </>
  );
}
