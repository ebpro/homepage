# Homepage shell (Astro, static)

Coquille Astro statique pour la page personnelle et le catalogue des supports
pédagogiques, en parallèle du site Quarto existant (`../index.qmd`). Sortie
`output: 'static'`, aucune SSR, aucun fetch au runtime.

## Contenu

Deux pages, toutes deux générées au build depuis la copie vendue du manifeste
du catalogue : `src/data/manifest.json`.

- `/` (index) : page personnelle — hero, bannière d'annonce, enseignement
  (cartes cours/notebooks/exemples), recherche, publications, contact.
- `/catalog/` : catalogue complet des dépôts `ebpro` (manifeste v8.6) avec
  recherche, filtre par catégorie et tri côté client (JS vanilla, aucune
  dépendance).

### Dérivation des cartes

Les cartes sont produites par le module partagé `src/data/cards.mjs`
(`deriveCards`, fonction pure, sans I/O), consommé par les deux pages :

- états `live` / `dead` / `no-develop` déduits de `site_live` (sonde de
  vivacité du manifeste v8.6) et de la présence d'une ref `develop` ;
- carte `dead` : aucun lien vers le site public (l'hôte est un catch-all
  DokuWiki, un 200 ne prouve pas la publication) — titre atténué, bouton
  « Latest » désactivé, pastille « Non publié » (parité avec le catalogue
  pédagogique v8.6) ;
- tri par défaut = tri du catalogue pédagogique (rang de catégorie, puis
  `formation|filière|nom` pour les cours, sinon `nom`).

La liste d'exclusion est centralisée dans `src/data/exclusions.mjs`
(`DENIED_REPOS`) : famille LP ECMN WebLang, hors catalogue par décision
utilisateur (2026-10-22) — sa matière est portée par la bannière d'annonce
et le catalogue pédagogique historique.

## Scripts

- Rafraîchir les données : `npm run data` (fetch du manifeste en ligne,
  validation du contrat v8.6 — `site_live` boolean par dépôt, échec dur sinon
  ; avertissement si un nom de la liste d'exclusion a disparu du manifeste).
  La copie régénérée est à committer.
- Prévisualiser en local : `npm install && npm run dev`.
- Construire : `npm run build` puis `npm run preview` (sert `dist/`).

## Déploiement

- Config : `base: '/homepage'`, `site: 'https://bruno.univ-tln.fr'`,
  `trailingSlash: 'never'`, styles inlinés (`build.inlineStylesheets:
  'always'`).
- Cibles sur `vai.univ-tln.fr` (compte `bruno`) :
  - `dist/index.html` → `~/homepage-astro/index.html`
  - `dist/catalog/index.html` → `~/homepage-astro/catalog/index.html`
  - exposition publique via le symlink `public_html/homepage` préparé à la
    main sur l'hôte.
- Le déploiement est **additif uniquement** (`rsync -a`, jamais `--delete`) :
  l'hôte porte d'autres arborescences qui ne doivent pas être touchées.
  Sauvegarder les fichiers existants dans `~/index-backups/` avant toute
  surcharge, et vérifier la somme sha256 local ↔ distant après copie.

## Limites connues

- L'état de publication est photographié au moment de la génération du
  manifeste (6 h en cron côté catalogue), pas vérifié en temps réel.
- Sections Recherche et Publications : contenu statique porté depuis
  `index.qmd` ; placeholders `TODO` résiduels à compléter après relecture.
