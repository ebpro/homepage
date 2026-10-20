# Homepage shell (Astro, static)

Coquille Astro statique pour la page personnelle, en parallèle du site Quarto
existant (`../index.qmd`). Sortie `output: 'static'`, aucune SSR, aucun fetch
au runtime.

## Contenu

La grille de cours est générée au build depuis une copie vendue du manifeste
du catalogue : `src/data/manifest.json`.

- Rafraîchir les données : `npm run data` (fetch du manifeste en ligne, copie
  régénérée à committer).
- Prévisualiser en local : `npm install && npm run dev`.
- Construire : `npm run build` puis `npm run preview` (sert `dist/`).

## Déploiement

Rien n'est déployé ici. La config fixe `base: '/homepage-astro'` comme chemin
de staging potentiel pour ne pas empiéter sur le Quarto live
(`bruno.univ-tln.fr/homepage/`) ; à ajuster lors d'une décision de publication.

## Limites connues

- Le manifeste (v8.x) ne porte pas de champ de vivacité par site : les cartes
  pointent vers l'URL publiée canonique
  `https://bruno.univ-tln.fr/teaching-material/<repo>/<branch>/` avec lien
  GitHub en secours. Avoir une réponse 200 ne prouve pas la publication
  (catch-all DokuWiki).
- Sections Recherche et Publications : placeholders `TODO`, à porter depuis
  `index.qmd` après relecture.
