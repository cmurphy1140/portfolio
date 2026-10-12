import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { vaultState } from "../scripts/vault-state.mjs";

describe("vaultState", () => {
  test("release: release is Released, whatever the stage", () => {
    assert.equal(vaultState({ release: "release", stage: "active" }), "Released");
    assert.equal(vaultState({ release: "release" }), "Released");
  });

  test("stage parked is Parked", () => {
    assert.equal(vaultState({ stage: "parked" }), "Parked");
    assert.equal(vaultState({ stage: "parked", release: "none" }), "Parked");
  });

  test("stage active is Active", () => {
    assert.equal(vaultState({ stage: "active" }), "Active");
  });

  test("an explicit site_state wins over stage and release", () => {
    assert.equal(vaultState({ site_state: "Parked", stage: "active", release: "alpha" }), "Parked");
    assert.equal(vaultState({ site_state: "Released", stage: "parked" }), "Released");
    assert.equal(vaultState({ site_state: "Active", release: "release" }), "Active");
  });

  test("a site_state the site does not use is an error, never a fallback", () => {
    assert.equal(vaultState({ site_state: "Shipped", stage: "active" }), null);
    assert.equal(vaultState({ site_state: "parked", stage: "active" }), null);
  });

  test("anything else is an error", () => {
    assert.equal(vaultState({}), null);
    assert.equal(vaultState({ stage: "idea" }), null);
    assert.equal(vaultState({ release: "draft", stage: "" }), null);
  });
});
