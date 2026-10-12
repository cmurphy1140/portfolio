import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { boot, COMMANDS, completions, run, type ShellState } from "@/components/shell";

const home: ShellState = { cwd: "~", history: [] };

describe("run: the closed command set", () => {
  test("help lists every command and exits 0", () => {
    const result = run("help", home);
    assert.equal(result.exit, 0);
    const text = result.lines.map((line) => ("text" in line ? line.text : "")).join("\n");
    for (const command of COMMANDS) assert.match(text, new RegExp(`^${command}\\b`, "m"));
  });

  test("an empty line is a no-op", () => {
    assert.deepEqual(run("   ", home), { lines: [], cwd: "~", exit: 0 });
  });

  test("an unknown command fails closed with exit 127", () => {
    const result = run("sudo whoami", home);
    assert.equal(result.exit, 127);
    assert.equal(result.lines[0]?.kind, "out");
    assert.match((result.lines[0] as { text: string }).text, /command not found/);
    assert.equal(result.navigate, undefined);
  });

  test("arguments with a colon, a space or a backslash are rejected before lookup", () => {
    for (const input of ["open https://example.com", "cat a\\b", "ls $(id)"]) {
      const result = run(input, home);
      assert.equal(result.exit, 1, input);
      assert.match((result.lines[0] as { text: string }).text, /unsupported characters/);
    }
  });

  test("cd and ls walk only the static tree", () => {
    const moved = run("cd work", home);
    assert.equal(moved.exit, 0);
    assert.equal(moved.cwd, "~/work");
    const listed = run("ls", { ...home, cwd: moved.cwd });
    assert.equal(listed.lines[0]?.kind, "listing");
    const labels = (listed.lines[0] as { entries: { label: string }[] }).entries.map((entry) => entry.label);
    assert.ok(labels.includes("vero"));
    assert.equal(run("cd ../../..", home).cwd, "~");
    assert.equal(run("cd etc", home).exit, 1);
  });

  test("cat refuses paths that are not in the tree", () => {
    assert.equal(run("cat /etc/passwd", home).exit, 1);
    assert.equal(run("cat ~/work", home).exit, 1);
    assert.equal(run("cat", home).exit, 1);
  });

  test("cat prints a destination document and selects it", () => {
    const result = run("cat ~/work/vero", home);
    assert.equal(result.exit, 0);
    assert.equal(result.select, "vero");
    assert.ok(result.lines.some((line) => line.kind === "link" && line.href === "/work/vero"));
  });

  test("history prints the session so far, numbered", () => {
    const result = run("history", { cwd: "~", history: ["ls", "cat README"] });
    assert.match((result.lines[0] as { text: string }).text, /^\s+1 {2}ls\n\s+2 {2}cat README$/);
    assert.equal((run("history", home).lines[0] as { text: string }).text, "(nothing yet)");
  });
});

describe("run: open", () => {
  test("a verified internal case study navigates to its manifest route", () => {
    const result = run("open vero", home);
    assert.equal(result.exit, 0);
    assert.equal(result.select, "vero");
    assert.equal(result.navigate, "/work/vero");
    assert.equal(result.external, undefined);
  });

  test("the Interview Gym Coach case study is reachable", () => {
    const result = run("open interview-gym-coach", home);
    assert.equal(result.exit, 0);
    assert.equal(result.navigate, "/work/interview-gym-coach");
  });

  test("an unverified destination is refused", () => {
    const result = run("open band-charter-outreach", home);
    assert.equal(result.exit, 1);
    assert.equal(result.navigate, undefined);
    assert.match((result.lines[0] as { text: string }).text, /not verified yet/);
  });

  test("a slug not in the manifest, a path, and no operand all fail", () => {
    assert.match((run("open nope", home).lines[0] as { text: string }).text, /not in the destination manifest/);
    assert.match((run("open work/vero", home).lines[0] as { text: string }).text, /not a slug/);
    assert.match((run("open", home).lines[0] as { text: string }).text, /missing operand/);
  });

  test("resume opens the resume artifact", () => {
    assert.equal(run("resume", home).navigate, "/resume");
  });
});

describe("completions", () => {
  test("completes command names from the closed set", () => {
    assert.deepEqual(completions("h", "~"), ["help", "history"]);
    assert.deepEqual(completions("", "~"), [...COMMANDS]);
  });

  test("completes open with manifest slugs and cat with entries of the cwd", () => {
    assert.deepEqual(completions("open ve", "~"), ["vero"]);
    assert.deepEqual(completions("cat R", "~"), ["README"]);
    assert.deepEqual(completions("cd w", "~"), ["work/"]);
    assert.deepEqual(completions("cat ve", "~/work"), ["vero"]);
  });

  test("an unknown verb and a stem with no match complete to nothing", () => {
    assert.deepEqual(completions("sudo x", "~"), []);
    assert.deepEqual(completions("open zzz", "~"), []);
    assert.deepEqual(completions("zzz", "~"), []);
  });

  test("the open pool is de-duplicated", () => {
    const all = completions("open ", "~");
    assert.ok(all.length > 0);
    assert.equal(new Set(all).size, all.length);
  });
});

describe("boot", () => {
  test("opens at home with a title and the home listing, nothing time-based", () => {
    const first = boot();
    assert.equal(first.cwd, "~");
    assert.deepEqual(first.lines[0], { kind: "out", text: "Personal OS — Connor Murphy", title: true });
    assert.ok(first.lines.some((line) => line.kind === "listing"));
    assert.deepEqual(boot(), first);
  });
});
