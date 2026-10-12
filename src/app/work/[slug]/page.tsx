import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { destinations, findDestination, type Destination } from "@/data/destinations";

export function generateStaticParams() {
  return destinations.filter((destination) => destination.kind === "case-study").map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const destination = findDestination(slug);
  return destination ? { title: `${destination.shortTitle} — Connor Murphy`, description: destination.summary } : {};
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination: Destination | undefined = findDestination(slug);
  if (!destination || destination.kind !== "case-study") notFound();
  const label = destination.category ?? "Case study";
  return (
    <div className="frame">
      <SiteHeader />
      <main className="doc">
        <Link className="doc-back" href="/#work">← All work</Link>
        <header className="doc-head">
          <p className="card-label"><span>{destination.shortTitle}</span><span>{label}</span></p>
          <h1 className="doc-title doc-question">{destination.question ?? destination.title}</h1>
          <p className="doc-state">{destination.state ? <><span className="doc-state-name">{destination.state}</span>{" "}</> : null}{destination.status}</p>
          <p className="doc-summary">{destination.summary}</p>
          {destination.number ? <p className="doc-number"><strong>{destination.number.value}</strong> {destination.number.label} · <a href={destination.number.proof}>{destination.number.proofLabel}</a></p> : null}
        </header>
        <hr className="centre-line" />
        <section className="doc-section" aria-labelledby="evidence-title"><h2 id="evidence-title">Evidence</h2><ul className="evidence">{destination.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
        {destination.correction ? <section className="doc-section" aria-labelledby="correction-title"><h2 id="correction-title">Corrected</h2><p className="doc-correction">{destination.correction}</p></section> : null}
        <section className="doc-section" aria-labelledby="learning-title"><h2 id="learning-title">What this taught</h2><p className="learning">{destination.learning}</p></section>
        {destination.tags ? <p className="doc-stack">Built with {destination.tags.join(" · ")}</p> : null}
      </main>
    </div>
  );
}
