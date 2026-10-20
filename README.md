# homepage

Page personnelle d'Emmanuel Bruno — migration progressive de https://bruno.univ-tln.fr vers Quarto (projet pilote, autonome, sans dépendance à `_quarto-utils`).

## Contenu

- `index.qmd` — page unique reproduisant la structure du site actuel (hero, Recherche, Enseignement, Publications sélectionnées, Contact)
- `_quarto.yml` — projet `website`, langue `fr`, navbar à ancres, pied de page contact + licence CC BY-NC-SA 4.0
- `images/logo.png` — logo repris du site actuel

## Rendu

```bash
quarto render            # si quarto installé localement
# ou via l'image de rendu de la flotte :
docker run --rm -v "$PWD":/work -w /work ghcr.io/ebpro/solen:quarto-full-68c5fb9 bash -lc 'quarto render'
```

Sortie : `_site/`.

## Déploiement

Le site est servi sur `https://bruno.univ-tln.fr/homepage/` (symlink Apache `public_html/homepage -> ../homepage/`). Déploiement par rsync du contenu de `_site/` vers `bruno@vai.univ-tln.fr:homepage/` (clé `~/.ssh/id_ed25519-deploy`).
