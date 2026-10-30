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
// with the develop preview link; seeding stays gated on state 'live').
// Each branch item renders with the preview-liveness href (branchHref
// below): the item links to its RENDER PREVIEW when a build-time probe
// (deriveCardsProbed) confirmed the preview page is live — `develop` ->
// `${SITE_BASE}/<name>/develop/` (literal folder), any other branch ->
// `${SITE_BASE}/<name>/previews/<branch, / -> ->/` (the ephemeral
// previews/ family) — and falls back to the GitHub tree link
// `${githubUrl}/tree/<branch>` when the preview is absent. An empty union
// renders a disabled "Branches" button (title « aucune branche listée »)
// — no fallback link.
//
// Preview liveness probe (build-time, PR #11): the previews/ family is
// EPHEMERAL (rm'd on branch delete) and the vendored manifest carries no
// per-branch liveness, so deriveCardsProbed() probes the candidate preview
// page for every branch item EXCEPT the seeded `develop` of a state-'live'
// card (the manifest's site_live probe already proves that one):
//   develop          -> ${SITE_BASE}/<name>/develop/index.html
//   any other branch -> ${SITE_BASE}/<name>/previews/<branch, / -> ->/index.html
// Bounded pool (<= PREVIEW_PROBE_CONCURRENCY in flight), per-probe
// AbortSignal.timeout, and ANY error / non-200 / signature mismatch = DEAD
// (fail closed — a dead preview must fall back to the tree link, never a
// dead site link). Liveness = HTTP 200 AND body matches the established
// Quarto signature: contains 'quarto-' OR is >= QUARTO_BODY_MIN_BYTES (the
// host catch-all once answered 200 with a ~23 KB fallback page — a 200
// alone is NOT evidence of publication; same doctrine as the
// teaching-catalog develop probe). Kill-switch: PREVIEW_PROBE=off skips all
// probes (pure /tree/ fallback; develop items of live cards unchanged).
//
// DETERMINISM CAVEAT: the live-preview set is time-dependent — the
// previews/ family churns upstream between builds, so dist bytes are NOT
// reproducible across days (local==runner byte equality holds only while
// no preview appeared or disappeared in between). CI authority remains the
// runner==live sha256 gate in ci.yml; do not treat a local-vs-runner byte
// diff as a build defect.
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

// --- Preview liveness probe (build-time, PR #11) -------------------------------
// Fail-closed probe of the candidate preview page per branch item. Liveness
// signature = HTTP 200 AND (body contains 'quarto-' OR byte length >=
// QUARTO_BODY_MIN_BYTES) — the same body-signature doctrine as the
// teaching-catalog develop probe (a 200 alone is not evidence of
// publication: the host catch-all historically answered 200 with a ~23 KB
// fallback page, and 24576 B sits just above that signature).
const PREVIEW_PROBE_CONCURRENCY = 16;
const PREVIEW_PROBE_TIMEOUT_MS = 8000;
const QUARTO_BODY_MARKER = 'quarto-';
const QUARTO_BODY_MIN_BYTES = 24576;

/** Probe one candidate preview page; true = live (200 + Quarto signature). */
async function probePreviewLive(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PREVIEW_PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const body = Buffer.from(await res.arrayBuffer());
    return (
      body.byteLength >= QUARTO_BODY_MIN_BYTES ||
      body.toString('latin1').includes(QUARTO_BODY_MARKER)
    );
  } catch {
    return false;
  }
}

/**
 * deriveCards + build-time preview probe (the catalogue page's entry point).
 *
 * Attaches `card.previewLive` — a Set of branch names whose render preview
 * the probe confirmed live — to EVERY card (empty when PREVIEW_PROBE=off,
 * so branchHref degrades to the pure /tree/ fallback). The seeded `develop`
 * item of a state-'live' card is not probed: the manifest's site_live
 * probe already proves it. A `develop` listed on a NON-live card IS probed
 * (candidate `…/develop/index.html` — develop always publishes to the
 * literal folder, never previews/); inert today, the manifest lists 0/115
 * develop entries.
 *
 * @param {{ repos: Array<object> }} manifest
 * @returns {Promise<Array<object>>} cards as deriveCards, each carrying
 *   `previewLive: Set<string>`
 */
export async function deriveCardsProbed(manifest) {
  const cards = deriveCards(manifest);
  for (const card of cards) card.previewLive = new Set();
  if (process.env.PREVIEW_PROBE === 'off') return cards;

  const targets = [];
  for (const card of cards) {
    for (const branch of card.branches) {
      if (branch === 'develop' && card.state === 'live') continue;
      const url =
        branch === 'develop'
          ? `${SITE_BASE}/${card.name}/develop/index.html`
          : `${SITE_BASE}/${card.name}/previews/${branch.replace(/\//g, '-')}/index.html`;
      targets.push({ card, branch, url });
    }
  }

  let next = 0;
  const workers = Array.from(
    { length: Math.min(PREVIEW_PROBE_CONCURRENCY, targets.length) },
    async () => {
      while (next < targets.length) {
        const t = targets[next++];
        if (await probePreviewLive(t.url)) t.card.previewLive.add(t.branch);
      }
    },
  );
  await Promise.all(workers);

  // Build-log evidence (also shows in CI): the probe split for this build.
  const liveCount = cards.reduce((n, c) => n + c.previewLive.size, 0);
  console.log(
    `[preview-probe] ${liveCount}/${targets.length} branch previews live`,
  );
  return cards;
}

// Branch-link rule (spec 2026-10-27, preview-liveness wave PR #11): a branch
// dropdown item links to its RENDER PREVIEW when the build-time probe marked
// it live — `develop` to the LITERAL `develop/` folder, every other branch to
// `previews/<slug>/` (`/` → `-`, the deploy-static publish path for
// non-default branches; ephemeral, rm'd on branch delete) — and otherwise to
// the GitHub tree link. The rule is NOT gated on card state: a
// feature-branch preview can exist while develop is unpublished (precedent:
// notebook-dev-web). Only the develop SEEDING in deriveCards stays gated on
// state 'live'. Branch names are never percent-encoded (PR #7 precedent:
// `/`-bearing names ship verbatim in the URL).
/**
 * Href for one "Branches" dropdown item (preview-liveness rule, PR #11).
 *
 *   `develop` (live card, or probed live) -> `${SITE_BASE}/<name>/develop/`
 *   other branch, probed live             -> `${SITE_BASE}/<name>/previews/<branch, / -> ->/`
 *   everything else                        -> `${githubUrl}/tree/<branch>`
 *
 * @param {{ name: string, githubUrl: string, state: 'live'|'dead'|'no-develop', previewLive?: Set<string> }} card
 * @param {string} branch
 * @returns {string} render-preview URL (probed live) or GitHub tree URL
 */
export function branchHref(card, branch) {
  const live = card.previewLive;
  if (branch === 'develop') {
    if (card.state === 'live' || (live && live.has('develop'))) {
      return `${SITE_BASE}/${card.name}/develop/`;
    }
    return `${card.githubUrl}/tree/develop`;
  }
  if (live && live.has(branch)) {
    return `${SITE_BASE}/${card.name}/previews/${branch.replace(/\//g, '-')}/`;
  }
  return `${card.githubUrl}/tree/${branch}`;
}
