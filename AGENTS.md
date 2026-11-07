# AGENTS.md - homepage

## Classification

- Depot d'outillage de corpus : le site vitrine et le catalogue public des supports d'enseignement. Ce n'est ni un cours, ni un ELO, ni un consommateur du pipeline de rendu Quarto.
- Owner unique par session (ADR-01, ADR-06). Depuis ADR-16, le lieu durable du contexte de session de ce depot est le present fichier.

## Deux contenus dans un seul depot

- Le site **publie** est le site Astro sous `astro/`. C'est le seul que la CI construit et depose.
- Le projet Quarto a la racine (`_quarto.yml`, `index.qmd`, `styles.css`) n'est pas construit par la CI : les etapes d'installation et de build travaillent dans `astro/`. Ne pas modifier la racine Quarto en croyant changer le site en ligne.

## Chaine de donnees

- `astro/src/data/manifest.json` est **versionne** : c'est une capture du manifest publie par le depot `teaching-catalog`, rafraichie par `npm run data`. Un build consomme cette capture, jamais l'API en direct.
- La source de rafraichissement est l'URL **publiee** du catalogue, pas l'API de l'organisation : le manifest disponible en ligne est donc en retard de l'etat de la publication la plus recente. Le script d'actualisation detecte et refuse explicitement une reponse qui n'est pas du JSON (classe page de repli) et un manifest sans tableau `repos`.
- `astro/src/data/exclusions.mjs` est la **source unique** de la liste noire affichee (grille d'accueil et page catalogue). Y ajouter ou retirer un nom change le catalogue. Le script d'actualisation avertit quand un nom de cette liste ne correspond plus a rien dans le manifest : un nom perime ou un depot renomme est ainsi detecte au rafraichissement plut qu'au moment ou une carte manque.
- Les liens de preview par branche sont sondes **au moment du build** : un lien n'est propose vers le site de rendu que si la page correspondante est effectivement vivante. La regle de vivabilite est une signature de corps (marqueur Quarto ou taille minimale), pas un statut.
- Consequence assumee et durable : les octets produits **dependent du moment du build**, parce que l'etat sonde change avec les publications des cours. La comparaison d'empreinte entre le poste de build et le fichier servi reste l'autorite de publication ; une comparaison entre deux machines differentes ne vaut que le jour meme.

## Regles de production et de CI

- Le pool d'execution est l'ensemble auto-helberge de l'organisation. La construction doit rester reproductible entre machines : les dates affichees se forment dans un fuseau explicite, jamais dans celui de l'hte.
- Les actions utilisees sont epingles par reference de commit. Aucune cle de cache d'Actions n'est demandee : l'installation s'appuie sur le cache local de l'executeur. C'est un choix delibere, pour ne pas faire croitre le compteur de cache de l'organisation.
- Aucune etape ne televerse d'artefact : ce depot ne doit pas consommer le compteur de stockage de l'organisation.
- La jambe de publication est exclue sur les evenements de requete : une branche laterale ou une requete ne publie rien. Elle s'execute sur poussee vers la branche par defaut et sur declenchement manuel.
- Le deploiement est un rsync **sans suppression** (`no --delete`) : il ajoute et met a jour, il ne retire pas les fichiers absents du build. Il est precede d'une sauvegarde horodatee sur l'hote, conservee en nombre borne, et suivi d'un controle d'egalite d'empreinte entre le fichier construit et le fichier servi.
- L'adresse de navigation du site n'est pas le chemin du repertoire de deploiement sur l'hote : la publication se verifie a l'URL publique, dont le chemin est celui configure dans `astro/astro.config.mjs` (le champ `base`).

## Regles editoriales

- Une carte ne doit jamais pretendre a une publication qu'elle n'a pas verifiee : une action indisponible reste visible et inactive, accompagnee du motif lisible.
- Les comptes de cartes, d'etats et de branches ne sont pas des constantes : ils dependent du manifest et de la sonde, et se mesurent.
- Un fait date n'entre pas dans la zone mince de ce fichier.

## Publication et autorisations

- Une poussee sur la branche par defaut **republie le site en ligne** (build, sauvegarde, rsync, controle d'empreinte). Cette consequence doit etre nommee avant toute demande de poussee ; elle se verifie dans le fichier de workflow, pas dans ce resume.
- Toute poussee : go-ahead humain individuel (ADR-04), portes fraiches avant, double lecture serveur apres, jamais `--force`, `-u`, `--tags`.

## Validation avant "fait"

- Une modification se valide par un build reel dans `astro/` et la relecture du fichier produit, puis par la relecture du fichier **servi** : signature de corps et en-tete de date. Un statut 200 seul ne prouve ni la publication ni la fraicheur.
- Une recherche dans un fichier HTML compact compte des **lignes**, pas des occurrences : un controle qui doit compter des occurrences le fait explicitement.
- Les verdicts de CI se lisent au niveau des **jobs**, jamais au niveau du run.

<!-- ADR-REGISTRY:BEGIN source=Teaching/TEACHING-FLEET.md -->
## Registre ADR

| ADR | Règle | Statut |
|---|---|---|
| ADR-01 | Un owner formel unique par projet. Une règle, pas un constat : tous les owners ne sont pas désignés. | actif |
| ADR-02 | Une fiche de démarrage est du contexte de session, jamais un fait daté. | rescopé par ADR-18 : le lieu durable du contexte d'un projet est son propre `AGENTS.md` versionné ; la distribution par copie n'est plus la voie |
| ADR-03 | Aucun énoncé d'état (commit, poussée, tag, fusion, écriture, suppression) sans relecture côté serveur ou côté dépôt. Une reconstitution qui n'exécute pas l'outil ne prouve rien. | actif |
| ADR-04 | Go-ahead humain explicite, formulé pour cette ressource et cette action, par mutation. Une autorisation dont la charge change est périmée et s'obtient de nouveau. | actif |
| ADR-05 | Le gel de la flotte est décidé et levé par l'humain. Sa valeur courante ne vit pas dans un fichier de doctrine : elle se lit côté serveur et au lieu d'état que nomme `TEACHING-FLEET.md`. | actif ; la valeur que ce registre portait en est retirée par ADR-18 |
| ADR-06 | Un owner unique pour `_quarto-utils` ; les autres flux n'y touchent pas. | actif |
| ADR-07 | Timeout borné sur toute commande, fail-fast sur toute atteinte non vérifiée. Une vérification perdue n'est jamais une vérification réussie. | actif |
| ADR-08 | Une preuve durable a un lieu durable : un ref, un tag, un artefact versionné. Jamais un fichier temporaire, jamais un objet git non atteignable. | actif |
| ADR-09 | Éligibilité scrub : fence `{.bash}`, légende « Capture de l'atelier - commandes et sortie, non exécutées par le rendu : », et honnêteté par document (vérifier `execute:` et `eval:` du document avant toute formulation). | actif |
| ADR-10 | Un `404` ne veut pas dire absent : l'API de contenu et l'arbre git ne couvrent pas le même espace. | actif |
| ADR-11 | Bundle du travail avant toute mutation git. | actif |
| ADR-12 | zsh ne découpe pas les mots : tableaux, ou sortie délimitée et lue proprement. | actif |
| ADR-13 | Le journal du corpus est la source unique de l'état **transverse** ; l'état d'un seul dépôt vit dans l'`AGENTS.md` de ce dépôt. | rescopé par ADR-17 |
| ADR-14 | Un projet ne publie pas son propre verdict. | actif |
| ADR-15 | *Aucun énoncé : cet identifiant n'a jamais été émis.* Il n'est pas remplacé, pour que les références à ADR-16 et ADR-17 restent vraies. | non émis |
| ADR-16 | Une passe de transfert d'état n'est pas une mission de contenu : pas de leçon, pas de TP, pas de relance de CI, pas de changement d'épinglage. Un dépôt par rédacteur ; une reprise commence par une remesure fraîche. | actif |
| ADR-17 | Un `AGENTS.md` de projet porte une zone mince sans fait daté, puis une unique section de registre de session. | modifié par ADR-18 : la borne ne se pose plus par position mais par classe de région, §11 |
| ADR-18 | Trois classes de région, §11 : ce qui est gelé est l'information et ses ancres, pas la phrase ; la zone mince est éditoriale sous retrait nommé ; le plancher dur de la mutation est inchangé. | actif |

## Invariant de vérification des montages

Un montage est l'intersection entre les entrées de `.gitmodules` et les répertoires réellement
présents à la racine du dépôt. Le total des liens git renvoyés par un `git ls-tree` récursif **n'est
pas** un nombre de montages. Ne jamais énoncer un nombre de montages dans un fichier de doctrine :
le mesurer à la demande.
<!-- ADR-REGISTRY:END -->

## Registre de session (zone ledger, hors Validation 5)

Fait date autorise ici uniquement ; la clause 5 de TEACHING-FLEET.md s'arrete a la ligne precedente.

### Identite

- Depot `ebpro/homepage`, branche par defaut `main`, clone sous `teaching-repos/homepage` cree le 2026-11-07 par la vague de creation des projets manquants (ruling humain : "crée les projets manquants en sous-repertoire frere").
- Aucun `AGENTS.md` n'existait dans ce depot a la creation du clone : `git ls-files --error-unmatch AGENTS.md` echouait. Le defaut etait signale par le journal de corpus (INDEX : domicile "non versionne a ce jour") ; il etait **vrai de l'autre clone**, pas de celui-ci. Ce fichier le versionne.
- **Second clone du meme depot sur ce poste** : `/Users/bruno/Documents/homepage`, sur la branche `fix/probe-quarto-2026-11` a `7311e53`, arbre propre a la mesure. Il n'est pas le lieu de travail de cette session. La coexistence est un fait, pas une decision : trancher le clone de travail nominal appartient a l'owner.

### Etat mesure a la creation du clone

- Parite avec la distante verifiee : HEAD local `fc240cbe5a2f04758731d2d48727cd644dcb0f01` == `git ls-remote origin refs/heads/main`.
- Aucun sous-module (mesure : `git config --file .gitmodules --get-regexp path` repond vide). 23 fichiers suivis, dont 15 sous `astro/`.
- `astro/` : `astro.config.mjs` (base `/homepage`, site `https://bruno.univ-tln.fr`), `src/pages/{index,catalog}.astro`, `src/components/Card.astro`, `src/data/{cards.mjs,exclusions.mjs,manifest.json}`, `src/styles/global.css`, `scripts/refresh-data.mjs`, `public/images/`.
- Sonde de preview au build, mesuree dans `src/data/cards.mjs` : pool borne a 16 requetes en parallele, echeance par requete, vivabilite = HTTP 200 **et** (marqueur `quarto-` **ou** taille au moins egale a 24576 octets), erreur ou non-200 = mort, aucun repli silencieux. Interrupteur `PREVIEW_PROBE=off`.
- Actualisation du manifest : source = `https://bruno.univ-tln.fr/teaching-material/catalog/manifest.json`, sortie = `src/data/manifest.json` (capture versionnee).
- CI : un seul job `build-check-deploy` sur le pool auto-helberge ; etapes de publication conditionnees par `github.event_name != 'pull_request'` ; sauvegarde distante a conserver 10 ; rsync `no --delete` vers le repertoire du site ; controle d'egalite d'empreinte apres publication ; suppression de la cle SSH en nettoyage. Mesures de verification : `upload-artifact` 0 occurrence, aucune cle de cache d'Actions demandee.

### Audit comparatif des deux clones (mesure du 2026-11-07)

- Clone A `/Users/bruno/Documents/homepage` : quatre branches locales (`main` a `34afe1d`,
  `astro-shell` a `268cb55`, `feat/branch-preview-liveness` a `82033f1`, `fix/probe-quarto-2026-11` a
  `7311e53`), toutes poussees, arbre propre. Apres `git fetch` : `astro-shell` en retard de 3 et `main`
  en retard de 2 sur la distante. **Aucun `AGENTS.md` nulle part** dans ce clone (ni disque, ni
  `git ls-files`). Aucun travail local hors distante : `git cherry` ne remonte que la branche de sonde,
  et ses commits sont deja sur la distante.
- Clone B `teaching-repos/homepage` (celui du decoupage par projet) : `main` a `68cda0e`, a parite de
  base avec la distante plus l'`AGENTS.md` versionne.
- La branche `fix/probe-quarto-2026-11` (le seul contenu propre a A) porte la **PR #13 ouverte**, base
  `astro-shell` : `fix(probe): use quarto signature only for liveness`, un seul fichier
  `astro/src/data/cards.mjs`, 9 ajouts / 16 suppressions ; CI de la PR `completed/success` lu au niveau
  run le 2026-11-03 ; son contenu n'est pas ancetre de `origin/main` (`git cherry` : signe +).
- Ruling humain de ce jour : « rien n'est en danger, on peut attendre ». La voie de travail nominale
  est B (c'est la que vit l'`AGENTS.md`) ; A n'est pas un depot de travail orphelin, c'est un depot de
  revue : sa seule valeur est la PR #13, dont la fusion vise `astro-shell`, donc **ne publie rien**
  (la publication est conditionnee aux poussees sur `main`). La decision qui reste est celle de la PR,
  pas celle du clone, et elle appartient a la prochaine session `homepage`.

### Missions ouvertes

- Choisir le clone de travail nominal de ce depot (deux clones sur le poste, cf. Identite).
- Relecture du contenu editorial de la table ADR par un second regard : la porte de derive prouve la forme, jamais le sens.

### Decisions humaines en attente

- Poussee du present commit : **elle republierait le site en ligne**, la jambe de publication s'executant sur toute poussee a la branche par defaut. Le go-ahead doit nommer cette consequence (ADR-04).
- Sortie du second clone (`/Users/bruno/Documents/homepage`, branche `fix/probe-quarto-2026-11`) : conserver, absorber, ou abandonner.

### Non negociables propres au depot

- Ne jamais relacher la condition de vivabilite des liens de preview pour obtenir plus de liens : le defaut a corriger est l'absence de publication, pas l'absence de lien.
- Ne pas rendre les octets du build deterministes en supprimant la sonde : le non-determinisme est le prix assume d'un lien qui ne ment pas.
- Ne pas toucher au projet Quarto de la racine pour changer le site publie.

### Pointeurs

- `teaching-repos/TEACHING-FLEET.md` : regles de flotte, seule autorite sur les valeurs partagees.
- `Teaching/AGENTS.md` : journal d'audit du corpus, etat transverse date, registres de decisions.
- `teaching-catalog/AGENTS.md` : le producteur du manifest consomme ici.
