/* The vault-state rule: how a note's frontmatter maps to a public state.
   An explicit site_state wins, for a note whose stage tracks private work
   while the public project rests (Catch 5: stage active for interview
   practice, development closed). Otherwise release: release is Released,
   stage parked is Parked, stage active is Active. Returns null when the
   note says none of these, or names a state the site does not use. */
const publicStates = ["Active", "Parked", "Released"];

export function vaultState(frontmatter) {
  if (frontmatter.site_state) return publicStates.includes(frontmatter.site_state) ? frontmatter.site_state : null;
  if (frontmatter.release === "release") return "Released";
  if (frontmatter.stage === "parked") return "Parked";
  if (frontmatter.stage === "active") return "Active";
  return null;
}
