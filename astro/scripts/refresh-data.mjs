// Refresh the vendored catalogue manifest used at build time.
// Usage: npm run data
// Output: src/data/manifest.json (committed copy, overwritten on refresh).
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DENIED_REPOS } from '../src/data/exclusions.mjs';

const URL_SOURCE =
  'https://bruno.univ-tln.fr/teaching-material/catalog/manifest.json';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'src', 'data', 'manifest.json');

const res = await fetch(URL_SOURCE);
if (!res.ok) {
  console.error(`Fetch failed: HTTP ${res.status} for ${URL_SOURCE}`);
  process.exit(1);
}

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  // The univ-tln host is a DokuWiki catch-all: an absent path still answers
  // HTTP 200 with an HTML fallback page. Validate the payload shape.
  console.error('Fetch returned non-JSON content (likely the DokuWiki fallback page).');
  process.exit(1);
}
if (!data || !Array.isArray(data.repos)) {
  console.error('Unexpected manifest shape: missing "repos" array.');
  process.exit(1);
}

// v8.6 contract: every repo carries a boolean site_live (per-site liveness
// probe). Hard-fail if the field is missing or not a boolean — the card
// derivation (src/data/cards.mjs) depends on it to pick live/dead/no-develop
// states, and a silent fallback would publish wrong "Non publié" badges.
const badLive = data.repos.filter(
  (r) => typeof r.site_live !== 'boolean',
);
if (badLive.length > 0) {
  console.error(
    `Manifest v8.6 contract violated: ${badLive.length} repo(s) without a boolean "site_live" field: ` +
      badLive.slice(0, 5).map((r) => r.name).join(', ') +
      (badLive.length > 5 ? ', …' : ''),
  );
  process.exit(1);
}

// Informational: deny-listed repos may legitimately disappear from the
// manifest upstream (e.g. renames). Warn only — the page derives from the
// manifest as-is.
const deniedMissing = DENIED_REPOS.filter(
  (entry) => !data.repos.some((r) => r.name === entry.name),
);
for (const entry of deniedMissing) {
  console.warn(
    `Deny-list warning: "${entry.name}" not present in the fetched manifest.`,
  );
}

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Wrote ${data.repos.length} repos (generated_at=${data.generated_at}) to ${out}`);
