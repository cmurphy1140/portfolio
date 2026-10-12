"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { boot, completions, run, verifiedCount } from "@/components/shell";
import Road from "@/components/road";
import SiteHeader from "@/components/site-header";
import TerminalPanel, { type TranscriptBlock } from "@/components/terminal-panel";
import LivingFocus from "@/components/living-focus";
import WorkPane from "@/components/work-pane";

/* The one controller. Card taps, listing taps and typed commands all go
   through execute(), which is the only caller of the command engine. */
export default function PersonalOS() {
  const router = useRouter();
  const initial = useMemo(() => boot(), []);
  const [blocks, setBlocks] = useState<TranscriptBlock[]>([{ id: 0, cwd: initial.cwd, lines: initial.lines }]);
  const [cwd, setCwd] = useState(initial.cwd);
  const [history, setHistory] = useState<string[]>([]);
  const [historyAt, setHistoryAt] = useState(0);
  const [input, setInput] = useState("");
  const [lastExit, setLastExit] = useState(0);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<HTMLDivElement>(null);

  const execute = (raw: string) => {
    const command = raw.trim();
    if (!command) return;
    const result = run(command, { cwd, history });
    const nextHistory = [...history, command];
    setHistory(nextHistory);
    setHistoryAt(nextHistory.length);
    setInput("");
    setCwd(result.cwd);
    setLastExit(result.exit);
    if (result.clear) {
      const fresh = boot();
      setBlocks([{ id: Date.now(), cwd: fresh.cwd, lines: fresh.lines }]);
      setCwd(fresh.cwd);
    } else {
      setBlocks((current) => [...current, { id: Date.now(), command, cwd, lines: result.lines }]);
    }
    if (result.external) window.location.assign(result.external);
    else if (result.navigate) router.push(result.navigate);
  };

  useEffect(() => {
    sessionRef.current?.scrollTo({ top: sessionRef.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [blocks]);

  useEffect(() => {
    const onGlobalKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setTerminalOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    execute(input);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab") {
      const matches = completions(input, cwd);
      if (matches.length === 1) {
        event.preventDefault();
        const parts = input.split(/\s+/);
        parts[parts.length - 1] = matches[0];
        setInput(parts.join(" "));
      }
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const step = event.key === "ArrowUp" ? -1 : 1;
      const next = Math.max(0, Math.min(history.length, historyAt + step));
      setHistoryAt(next);
      setInput(next === history.length ? "" : history[next] ?? "");
    }
    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      execute("clear");
    }
  };

  const openTerminal = () => setTerminalOpen(true);

  return (
    <div className="frame">
      <a className="skip-link" href="#work">Skip to selected work</a>
      <SiteHeader onTerminal={openTerminal} terminalOpen={terminalOpen} />
      <main>
        <section className="living-hero" aria-labelledby="hero-title">
          <div className="hero-context"><span>Software engineer. Always a student.</span><time dateTime="2026-10-12">Updated October 12, 2026</time></div>
          <h1 id="hero-title">Connor<br />Murphy<span aria-hidden="true">.</span></h1>
          <div className="hero-bottom">
            <p>I build things to understand them.<br />Then I follow the next question.</p>
            <div className="hero-intro"><p>Computer science graduate from the University of New Hampshire. Exploring software, systems, and the space between an idea and something that works.</p><div className="hero-actions"><a className="button button--primary" href="#work">Explore the work</a><a className="button" href="/Connor_Murphy_Resume.pdf" download>Download résumé</a></div></div>
          </div>
        </section>
        <LivingFocus />
        <WorkPane execute={execute} />
        <hr className="centre-line" />
        <Road />
      </main>
      <footer className="site-footer">
        <p>Connor Murphy · <Link href="/resume">Résumé</Link> · <Link href="/timeline">Timeline</Link></p>
        <p>
          Prefer the keyboard?{" "}
          <button className="text-button" type="button" aria-controls="terminal" aria-expanded={terminalOpen} onClick={openTerminal}>Open the portfolio terminal</button>{" "}
          <kbd>⌘K</kbd>
        </p>
      </footer>
      <TerminalPanel
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        blocks={blocks}
        cwd={cwd}
        input={input}
        setInput={setInput}
        execute={execute}
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
        inputRef={inputRef}
        sessionRef={sessionRef}
        verifiedCount={verifiedCount}
        lastExit={lastExit}
      />
    </div>
  );
}
