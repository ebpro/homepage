#!/usr/bin/env bash
# Structural checks for the built Astro homepage.
#
# Run from the repo root AFTER `npm run build` (working directory astro/).
# Guards the published site against its documented failure classes:
#   (a) DokuWiki fallback body — the host catch-all once served a ~23 KB
#       DokuWiki fallback on HTTP 200 for absent paths (2026-10-16); the
#       built pages must carry zero DokuWiki markers.
#   (b) card-count incoherence — the catalog card grid must stay coherent
#       with the vendored manifest minus the deny-list (computed, never
#       hardcoded), and every card renders its four action buttons.
#   (c) literal undefined/NaN leaking into rendered text.
#   (d) implausible page sizes (empty or truncated builds).
#
# Output: one PASS table line on success; ::error:: + exit 1 on any failure.

set -euo pipefail

DIST="astro/dist"
INDEX="$DIST/index.html"
CATALOG="$DIST/catalog/index.html"

fail() {
  echo "::error::ci-checks: $1"
  exit 1
}

for f in "$INDEX" "$CATALOG"; do
  [ -f "$f" ] || fail "missing built page: $f (run 'npm run build' in astro/ first)"
done

# --- (a) no DokuWiki fallback markers in built pages --------------------------
doku_hits="$( { grep -io 'dokuwiki\|lib/exe' "$INDEX" "$CATALOG" || true; } | wc -l | tr -d '[:space:]')"
[ "$doku_hits" -eq 0 ] || fail "DokuWiki fallback marker found in built pages ($doku_hits hits)"

# --- (b) card-count coherence --------------------------------------------------
# Card elements are <article class="card" data-catalog-card data-state=…> —
# the attribute is boolean (no value). The catalog page also contains the
# inline-JS selector 'article[data-catalog-card]' exactly once; the
# trailing-space form matches only the real card attributes.
cards="$(grep -o 'data-catalog-card ' "$CATALOG" | wc -l | tr -d '[:space:]')"
[ "$cards" -gt 0 ] || fail "no data-catalog-card attributes found in $CATALOG"

stable="$(grep -o '>Stable<' "$CATALOG" | wc -l | tr -d '[:space:]')"
latest="$(grep -o '>Latest<' "$CATALOG" | wc -l | tr -d '[:space:]')"
branches="$(grep -o '>Branches<' "$CATALOG" | wc -l | tr -d '[:space:]')"
source="$(grep -o '>Source<' "$CATALOG" | wc -l | tr -d '[:space:]')"

# Expected card count from data (NOT hardcoded): manifest repos with a string
# name, minus the exclusions.mjs deny-list — the same filter deriveCards()
# applies in astro/src/data/cards.mjs. The +1 on Source is the page-level
# "Source" link (catalog page footer), separate from the per-card buttons.
expected="$(node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { isDenied } from "./astro/src/data/exclusions.mjs";
  const m = JSON.parse(readFileSync("astro/src/data/manifest.json", "utf8"));
  const repos = (m.repos ?? []).filter((r) => r && typeof r.name === "string");
  if (typeof m.count === "number" && m.count !== repos.length) {
    console.error(`manifest self-inconsistent: count=${m.count} vs repos.length=${repos.length}`);
    process.exit(1);
  }
  process.stdout.write(String(repos.filter((r) => !isDenied(r.name)).length));
')"

[ "$cards" -eq "$stable" ] || fail "Stable button count ($stable) != card count ($cards)"
[ "$cards" -eq "$latest" ] || fail "Latest button count ($latest) != card count ($cards)"
[ "$cards" -eq "$branches" ] || fail "Branches button count ($branches) != card count ($cards)"
[ "$source" -eq "$((cards + 1))" ] || fail "Source count ($source) != cards+1 ($((cards + 1)))"
[ "$cards" -eq "$expected" ] || fail "card count ($cards) != manifest repos minus exclusions ($expected)"

# --- (c) no literal undefined/NaN in rendered text -----------------------------
# Rendered text = HTML with <script>/<style> blocks and all tags stripped
# (inline JS legitimately contains Number.isNaN — it is not rendered text).
text_hits="$(node -e '
  const fs = require("fs");
  let hits = 0;
  for (const f of process.argv.slice(1)) {
    const html = fs.readFileSync(f, "utf8");
    const text = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    const m = text.match(/\bundefined\b|\bNaN\b/g);
    if (m) hits += m.length;
  }
  process.stdout.write(String(hits));
' "$INDEX" "$CATALOG")"
[ "$text_hits" -eq 0 ] || fail "literal undefined/NaN in rendered text ($text_hits hits)"

# --- (d) sanity sizes -----------------------------------------------------------
index_bytes="$(wc -c < "$INDEX" | tr -d '[:space:]')"
catalog_bytes="$(wc -c < "$CATALOG" | tr -d '[:space:]')"
[ "$index_bytes" -ge 30720 ] || fail "index.html implausibly small: ${index_bytes} B (< 30 KB)"
[ "$catalog_bytes" -ge 102400 ] || fail "catalog/index.html implausibly small: ${catalog_bytes} B (< 100 KB)"

# --- PASS table (one line) ------------------------------------------------------
echo "ci-checks: PASS | (a) dokuwiki-markers: 0 | (b) cards: ${cards} == manifest(${expected}) S=${stable} L=${latest} B=${branches} Src=${source} | (c) undefined/NaN: 0 | (d) sizes: index=${index_bytes}B catalog=${catalog_bytes}B"
