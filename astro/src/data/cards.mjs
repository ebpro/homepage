// Shared card derivation for the teaching-material catalogue.
//
// Pure function: no network, no I/O. Consumed by the catalogue page:
//   - src/pages/catalog.astro (full catalogue, grouped by category)
// The homepage (src/pages/index.astro) no longer renders cards — it keeps
// the "Cours universitaires" table and links to /catalog/ instead.
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
// Branches: the card's "Branches" action uses the deduped union of the
// manifest's `branches` array and the `dates.branches` keys (both shapes are
// tolerated — manifests before the v8.6 liveness probe ship the array only);
// an empty union falls back to a plain `<github_url>/branches` link.
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

// Topic hygiene (parity with legacy _display_topics): the org's labelling
// machinery is not a teaching subject — excluded from the card pills, the
// data-topics haystack and the Thèmes select.
const SYSTEM_TOPIC_PREFIXES = ['area-', 'status-', 'formation-', 'filiere-'];
const SYSTEM_TOPICS = new Set(['fmt-ipynb', 'review', 'github-actions', 'self-hosted']);

// Topics carried by at least this many cards land in the "Fréquents"
// optgroup of the Thèmes select (legacy TOPIC_FREQUENT_MIN).
export const TOPIC_FREQUENT_MIN = 5;

// FR labels for the two teaching axes (parity with legacy).
export const FORMATION_LABELS = { cnam: 'CNAM', utln: 'UTLN' };
export const FILIERE_LABELS = {
  'mi-a2': 'MI A2',
  'm1-info-math': 'M1 Info Math',
  'm2-info-math': 'M2 Info Math',
  'lp-ecmn': 'LP ECMN',
};

/** Sorted non-system topics of a repo (single source of truth for the card
    pills, the data-topics haystack and the Thèmes select). */
export function displayTopics(topics) {
  return (topics || [])
    .filter(
      (t) =>
        !SYSTEM_TOPIC_PREFIXES.some((p) => t.startsWith(p)) &&
        !SYSTEM_TOPICS.has(t)
    )
    .sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Human label for an axis slug ("" stays ""). */
export function axisLabel(labels, slug) {
  return slug ? labels[slug] ?? slug : '';
}

const frDateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** `2026-10-17T12:32:00Z` -> `17/10/2026` (build-time, date only). */
export function frDateAbs(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : frDateFmt.format(d);
}

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
    const releasesLive = r.releases_live === true;
    const latestVtag = r.latest_vtag || '';
    const stableUrl =
      releasesLive && latestVtag
        ? `${SITE_BASE}/${r.name}/releases/${latestVtag}/`
        : '';
    const branches = [
      ...new Set([
        ...(Array.isArray(r.branches)
          ? r.branches.filter((b) => typeof b === 'string' && b)
          : []),
        ...(r.dates && typeof r.dates.branches === 'object' && r.dates.branches
          ? Object.keys(r.dates.branches)
          : []),
      ]),
    ];

    return {
      name: r.name,
      description: r.description || '',
      status: r.status || 'unknown',
      category: r.category || 'none',
      formation: r.formation || '',
      filiere: r.filiere || '',
      topics: displayTopics(r.topics),
      branches,
      githubUrl: r.github_url,
      state,
      branch,
      landing,
      primary,
      releasesLive,
      latestVtag,
      stableUrl,
      dateFull,
      date: dateFull ? dateFull.slice(0, 10) : null,
      dateAbs: frDateAbs(dateFull),
      stableDateAbs: frDateAbs(r.dates?.stable || r.pushed_at || null),
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
