/* The vault-state rule: how a note's frontmatter maps to a public state.
   Returns "Released", "Parked" or "Active", or null when the note says none. */
export function vaultState(frontmatter) {
  if (frontmatter.release === "release") return "Released";
  if (frontmatter.stage === "parked") return "Parked";
  if (frontmatter.stage === "active") return "Active";
  return null;
}
