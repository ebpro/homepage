// Refresh the vendored catalogue manifest used at build time.
// Usage: npm run data
// Output: src/data/manifest.json (committed copy, overwritten on refresh).
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Wrote ${data.repos.length} repos (generated_at=${data.generated_at}) to ${out}`);
