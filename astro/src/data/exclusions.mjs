// Deny-list: repositories excluded from the homepage catalogue (both the
// index card grid and the /catalog/ page).
//
// Decision (user ruling, 2026-10-22): the LP ECMN WebLang family is not part
// of the new catalogue — its course material is surfaced through the DokuWiki
// notice banner on the homepage and through the legacy teaching catalog, not
// through the generated card grids.
//
// This module is the single source of truth: the shared card derivation
// (src/data/cards.mjs) skips these names, and scripts/refresh-data.mjs warns
// if a name here no longer exists in the manifest (typo or repo renamed).

export const DENIED_REPOS = [
  {
    name: 'notebook-dev-web',
    reason: 'LP ECMN WebLang family (user ruling)',
    since: '2026-10-22',
  },
  {
    name: 'lecture-UTLN-LP_ECMN-WebLang',
    reason: 'LP ECMN WebLang family (user ruling)',
    since: '2026-10-22',
  },
];

export const isDenied = (name) =>
  DENIED_REPOS.some((entry) => entry.name === name);
