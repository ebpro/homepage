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
// tolerated — manifests before the v8.6 liveness probe ship the array only).
// For state-'live' cards, `develop` is PREPENDED to the union (the manifest
// never lists the default branch — 0/115 fleet-wide — so the dropdown leads
// with the develop preview link). Each listed branch renders as a dropdown
// item whose href follows the hybrid link rule (branchHref below): a
// render-preview URL for `develop` / `YYYY` year-snapshot branches of a
// site-publishing repo (state 'live'), a GitHub tree link for every other
// branch. An empty union renders a disabled "Branches" button (title
// « aucune branche listée ») — no fallback link.
//
// Per-action dates (spec 2026-10-24): cards expose `stableIso`/`latestIso`
// (the manifest's `dates.stable`/`dates.latest`, no fallback) plus their
// absolute `dd/MM/yyyy HH:mm` rendering (`stableDateDT`/`latestDateDT`).
// The per-action date chips are the only date display on a card — the
// generic meta-row date was removed.
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
  timeZone: 'Europe/Paris',
});

/** `2026-10-17T12:32:00Z` -> `17/10/2026` (build-time, date only). */
export function frDateAbs(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : frDateFmt.format(d);
}

const frDateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});

/** `2026-10-17T12:32:00Z` -> `17/10/2026 14:32` (build-time, Europe/Paris —
    pinned, so the output is identical on any build machine regardless of its
    own TZ; Intl resolves the per-instant offset, DST included).
    Same Intl options as the client-side chip toggle in Card.astro, so the
    server-rendered and JS-toggled absolute forms are byte-identical. */
export function frDateTimeAbs(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : frDateTimeFmt.format(d);
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
    // Live cards lead the dropdown with the develop preview link: the
    // manifest's branch lists never carry the default branch (verified
    // fleet-wide: 0/115), so seed it explicitly for the preview-class repos.
    const branches = [
      ...new Set([
        ...(state === 'live' ? ['develop'] : []),
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
      stableIso: r.dates?.stable || null,
      latestIso: r.dates?.latest || null,
      stableDateDT: frDateTimeAbs(r.dates?.stable),
      latestDateDT: frDateTimeAbs(r.dates?.latest),
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

// Hybrid branch-link rule (spec 2026-10-27, user-approved; publish-path
// correction 2026-10-27): a branch item links to the render preview IFF the
// repo publishes a site — card state 'live', i.e. the manifest's build-time
// `site_live === true` develop-liveness probe (the same static signal that
// enables the "Latest" site link) — AND the branch is `develop` or a `YYYY`
// year snapshot (org branch policy). The publish path is NOT one shape
// (deploy-static in render-quarto.yml): the default branch renders into the
// LITERAL `develop/` folder, every other branch into `previews/<slug>/`
// (`/` → `-`, ephemeral), `v*` tags into `releases/<tag>/` — so the two
// preview arms build different URLs. Every other branch name (feature/test/
// prefixes, master/main/…, repos without a live site) keeps the GitHub
// source link. Branch names are never percent-encoded (PR #7 precedent:
// `/`-bearing names ship verbatim in the URL).
const PREVIEW_BRANCH_RE = /^\d{4}$/;

/**
 * Href for one "Branches" dropdown item (hybrid rule, spec 2026-10-27,
 * publish-path-corrected 2026-10-27).
 *
 * Preview arms (state 'live' only):
 *   `develop`          -> `${SITE_BASE}/<name>/develop/` (literal folder)
 *   `YYYY` year branch -> `${SITE_BASE}/<name>/previews/<YYYY>/`
 * Every other branch   -> `${githubUrl}/tree/<branch>` (GitHub source).
 *
 * @param {{ name: string, githubUrl: string, state: 'live'|'dead'|'no-develop' }} card
 * @param {string} branch
 * @returns {string} render-preview URL (site-eligible repo + develop/year
 *   branch) or GitHub tree URL (every other branch)
 */
export function branchHref(card, branch) {
  if (card.state === 'live' && branch === 'develop') {
    return `${SITE_BASE}/${card.name}/develop/`;
  }
  if (card.state === 'live' && PREVIEW_BRANCH_RE.test(branch)) {
    return `${SITE_BASE}/${card.name}/previews/${branch}/`;
  }
  return `${card.githubUrl}/tree/${branch}`;
}
