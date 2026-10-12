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

  test("anything else is an error", () => {
    assert.equal(vaultState({}), null);
    assert.equal(vaultState({ stage: "idea" }), null);
    assert.equal(vaultState({ release: "draft", stage: "" }), null);
  });
});
