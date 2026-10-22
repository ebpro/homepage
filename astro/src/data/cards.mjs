// Shared card derivation for the homepage catalogue.
//
// Pure function: no network, no I/O. Consumed by BOTH card surfaces:
//   - src/pages/index.astro  (teaching subset: lectures, notebooks, samples)
//   - src/pages/catalog.astro (full catalogue, grouped by category)
//
// Card states (from the teaching-catalog v8.6 manifest):
//   live       — a develop ref exists and `site_live` is true: the published
//                site was reachable at data-generation time.
//   dead       — a develop ref exists but `site_live` is false: the public
//                site was NOT reachable at data-generation time. The host is a
//                DokuWiki catch-all (an absent path still answers 200 with a
//                fallback page), so a dead card deliberately carries NO site
//                links — only GitHub (parity with teaching-catalog v8.6's
//                `btn-disabled title="non publie"` demotion).
//   no-develop — the repo has no develop branch: GitHub links only.
//
// `primary` (where title/description/"Latest" point for a live card):
//   1. a live tagged release (`releases_live && latest_vtag`) — stable URL,
//      survives develop re-renders;
//   2. otherwise the develop landing.
//
// Ordering = teaching-catalog default sort: category rank, then the legacy
// sort key (lectures: formation|filiere|name; everything else: name), then
// name. CATEGORY_RANK values mirror catalog.py @ ad51769.

import { isDenied } from './exclusions.mjs';

// No trailing slash: landing URLs are built as `${SITE_BASE}/${name}/${branch}/`.
export const SITE_BASE = 'https://bruno.univ-tln.fr/teaching-material';

export const CATEGORY_RANK = {
  lecture: 0,
  notebook: 1,
  sample: 2,
  standard: 3,
  reference: 4,
  image: 5,
  cicd: 6,
  tooling: 6,
  infra: 7,
  meta: 8,
  personal: 9,
  student: 10,
  none: 11,
};

// FR labels for the /catalog/ page (section headings + category filter).
export const CATEGORY_LABELS = {
  lecture: 'Cours',
  notebook: 'Notebooks',
  sample: 'Exemples de code',
  standard: 'Standards',
  reference: 'Références',
  image: 'Images',
  cicd: 'CI/CD',
  tooling: 'Outils & CI',
  infra: 'Infrastructure',
  meta: 'Méta',
  personal: 'Personnel',
  student: 'Étudiants',
  none: 'Sans catégorie',
};

// FR status badges. `active` is the default state: no badge. Unknown statuses
// render no badge (forward compatibility with future manifest values).
export const STATUS_LABELS = {
  partial: 'Partiel',
  stub: 'Brouillon',
  frozen: 'Gelé',
};

const rankOf = (category) => CATEGORY_RANK[category] ?? 11;

// Legacy-compatible sort key (catalog.py `_default_sortkey`).
const sortKeyOf = (r) =>
  r.category === 'lecture'
    ? `${r.formation}|${r.filiere}|${r.name.toLowerCase()}`
    : r.name.toLowerCase();

/**
 * Derive display cards from a teaching-catalog manifest object.
 *
 * @param {{ repos: Array<object> }} manifest
 * @returns {Array<object>} cards, sorted by (category rank, legacy key, name)
 */
export function deriveCards(manifest) {
  const repos = (manifest?.repos ?? [])
    .filter((r) => r && typeof r.name === 'string')
    .filter((r) => !isDenied(r.name));

  const cards = repos.map((r) => {
    const developRef = r.dates?.latest_ref ?? null;
    const state = developRef
      ? r.site_live === true
        ? 'live'
        : 'dead'
      : 'no-develop';
    const branch = developRef || r.default_branch || 'develop';
    const landing = `${SITE_BASE}/${r.name}/${branch}/`;
    const primary =
      r.releases_live && r.latest_vtag
        ? `${SITE_BASE}/${r.name}/releases/${r.latest_vtag}/`
        : state === 'live'
          ? landing
          : r.github_url;
    const dateFull = r.dates?.latest || r.pushed_at || null;

    return {
      name: r.name,
      description: r.description || '',
      status: r.status || 'unknown',
      category: r.category || 'none',
      formation: r.formation || '',
      filiere: r.filiere || '',
      githubUrl: r.github_url,
      state,
      branch,
      landing,
      primary,
      dateFull,
      date: dateFull ? dateFull.slice(0, 10) : null,
    };
  });

  cards.sort(
    (a, b) =>
      rankOf(a.category) - rankOf(b.category) ||
      sortKeyOf(a).localeCompare(sortKeyOf(b)) ||
      a.name.localeCompare(b.name),
  );

  return cards;
}
