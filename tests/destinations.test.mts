/* The manifest rules from scripts/verify-destinations.mjs, mirrored here so
   they run offline with the rest of the suite (the script also HEAD-fetches
   every https href, which stays in `npm run validate:destinations`). */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { destinationKinds, destinations, findDestination } from "@/data/destinations";

describe("destination manifest", () => {
  test("slugs are lowercase kebab-case and unique", () => {
    const seen = new Set<string>();
    for (const destination of destinations) {
      assert.match(destination.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(!seen.has(destination.slug), `${destination.slug}: duplicate slug`);
      seen.add(destination.slug);
    }
  });

  test("every kind is a known kind", () => {
    for (const destination of destinations) {
      assert.ok((destinationKinds as readonly string[]).includes(destination.kind), destination.slug);
    }
  });

  test("hrefs are internal routes or https, never another scheme", () => {
    for (const destination of destinations) {
      assert.ok(
        destination.href.startsWith("/") || /^https:\/\//.test(destination.href),
        `${destination.slug}: ${destination.href}`,
      );
      assert.doesNotMatch(destination.href, /^(file:|javascript:|data:)/i, destination.slug);
    }
  });

  test("a verified destination has an href", () => {
    for (const destination of destinations) {
      if (destination.verified) assert.ok(destination.href, destination.slug);
    }
  });

  test("a case study lives at /work/<slug>", () => {
    for (const destination of destinations) {
      if (destination.kind === "case-study") assert.equal(destination.href, `/work/${destination.slug}`);
    }
  });

  test("primary case studies carry a state: Active, Parked or Released", () => {
    for (const destination of destinations) {
      if (destination.kind === "case-study" && destination.primary) {
        assert.ok(
          "state" in destination && ["Active", "Parked", "Released"].includes(destination.state),
          `${destination.slug}: no valid state`,
        );
      }
    }
  });

  test("every case study leads with a non-empty question", () => {
    for (const destination of destinations) {
      if (destination.kind === "case-study") {
        assert.ok("question" in destination && destination.question.trim(), `${destination.slug}: no question`);
      }
    }
  });

  test("a number's proof link is https", () => {
    for (const destination of destinations) {
      if ("number" in destination) assert.match(destination.number.proof, /^https:\/\//, destination.slug);
    }
  });

  test("at most two destinations carry a correction", () => {
    const corrected = destinations.filter((destination) => "correction" in destination);
    assert.ok(corrected.length <= 2, `${corrected.length} corrections`);
  });

  test("findDestination returns the entry or undefined, never a near match", () => {
    assert.equal(findDestination("vero")?.slug, "vero");
    assert.equal(findDestination("Vero"), undefined);
    assert.equal(findDestination("vero/"), undefined);
  });
});
