#!/usr/bin/env bash
# The one check. Runs every check this repository has, prints the counts, and
# exits non-zero on any failure. CI runs it too, so no check exists only in CI.
#
#   validate:destinations  every navigation destination resolves
#   lint                   eslint
#   test                   node --test suites under tests/
#   build                  next build
#   validate:privacy       the built output holds nothing private
#   validate:images        every image reference resolves with exact case
#   validate:vault         destination status matches the vault note (skipped
#                          when the vault is absent, as on CI)
set -uo pipefail
cd "$(dirname "$0")/.."

fail() { echo "check: $*" >&2; exit 2; }
command -v node >/dev/null 2>&1 || fail "node is missing. Node 22 or newer is required."
command -v npm  >/dev/null 2>&1 || fail "npm is missing. Node 22 or newer is required."
[ -d node_modules ] || fail "node_modules is missing. Run 'npm ci' first."

log=$(mktemp)
trap 'rm -f "$log"' EXIT
status=0

step() {
  echo "== $1"
  shift
  "$@" 2>&1 | tee -a "$log"
  [ "${PIPESTATUS[0]}" -eq 0 ] || { echo "check: step failed: $*" >&2; status=1; }
}

step destinations npm run --silent validate:destinations
step lint npm run --silent lint
step tests npm test
step build npm run --silent build
step privacy npm run --silent validate:privacy
step images npm run --silent validate:images

# The vault path comes from PORTFOLIO_VAULT or the gitignored .vault-path file (one line),
# so no local path enters this public repo. CI has neither and skips.
vault="${PORTFOLIO_VAULT:-$( [ -f .vault-path ] && head -1 .vault-path )}"
if [ -z "$vault" ]; then vault="(not set)"; fi
export PORTFOLIO_VAULT="$vault"
if [ ! -d "$vault" ]; then
  echo "== vault"
  echo "skipped: PORTFOLIO_VAULT=$vault does not exist on this machine"
  vault_state="skipped"
else
  step vault npm run --silent validate:vault
  vault_state="run"
fi

node_count() { grep -aoE "^(# |ℹ )$1 [0-9]+" "$log" | tail -1 | grep -oE '[0-9]+' || echo 0; }
node_pass=$(node_count pass)
node_fail=$(node_count fail)
refs=$(grep -aoE '\[INFO\] [0-9]+ reference' "$log" | tail -1 | grep -oE '[0-9]+' || echo 0)

echo
echo "Checked $(date -u +%Y-%m-%d): Node tests $node_pass passed, $node_fail failed; build ok; $refs image references resolve; vault $vault_state."
if [ "$status" -eq 0 ] && [ "$node_fail" = 0 ] && [ "$node_pass" -gt 0 ]; then
  echo "check: passed"
else
  echo "check: FAILED" >&2
  exit 1
fi
