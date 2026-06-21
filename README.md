# Pet's Book

Plateforme de réseau social et d'entraide pour animaux domestiques. Projet de certification RNCP 37273 — Développeur web fullstack. Conçu en éco-conception (images WebP/AVIF, lazy loading) et accessible WCAG AA.

## Stack technique

- **Front** : Vite, SCSS (architecture 7-1), JavaScript ES6 modules
- **Back** : Node.js, Express, SQLite (better-sqlite3), bcrypt
- **Déploiement** : Netlify (front) + Render (back)

## Structure du projet

```text
pets-book/
├── client/              # Front-end Vite + SCSS
├── server/              # Back-end Express + SQLite
│   └── src/etl/         # Pipeline de données (sources, snapshots, build)
├── data/                # Dataset unifié généré (animals.unified.json + .csv)
└── _legacy/             # Ancien projet (référence uniquement)
```

## Prérequis

- **Node.js ≥ 20.19** (testé sous Node 22 — voir `.nvmrc`) et **npm ≥ 10**.
  Avec nvm : `nvm use` à la racine pour basculer sur la bonne version.
- Les versions requises sont déclarées via le champ `engines` des `package.json`.
- Accès réseau pour `npm run dataset` (sinon le pipeline retombe sur les snapshots committés).

## Installation (à faire une seule fois)

Ces étapes ne sont nécessaires qu'au premier démarrage (ou après un `git pull`
qui ajoute des dépendances).

```bash
# 1. Back-end
cd server
npm install
cp .env.example .env      # ajuster les secrets (et clés API optionnelles)
npm run seed              # crée la base SQLite à partir du dataset

# 2. Front-end (dans un autre terminal)
cd client
npm install
```

> Le dépôt contient déjà `data/animals.unified.json` : `npm run seed` suffit pour
> démarrer. Le pipeline `npm run dataset` est **optionnel** et ne sert qu'à
> rafraîchir les données depuis les sources externes (voir
> [Données : dataset unifié](#données--dataset-unifié-etl)).

## Lancer le projet au quotidien

À chaque réouverture du projet, il suffit de démarrer les **deux serveurs** dans
**deux terminaux séparés**.

```bash
# Terminal 1 — Back-end (API)
cd server
npm run dev               # API sur http://localhost:3000
```

```bash
# Terminal 2 — Front-end (le site)
cd client
npm run dev               # http://localhost:5173
```

👉 Ouvre ensuite <http://localhost:5173> dans ton navigateur.

> Pas besoin de relancer `npm install` ni `npm run seed` à chaque fois : ces
> étapes font partie de l'[installation](#installation-à-faire-une-seule-fois).

## Données : dataset unifié (ETL)

Les animaux proviennent de **vraies données open data**, assemblées par **union
verticale** de trois sources vers un schéma commun (18 colonnes, colonne `source`
pour tracer l'origine). Un module de **post-traitement** (`translate.js`) traduit
ensuite tout le contenu en français : races, tempéraments, couleurs, âges,
descriptions et localisations. Les annonces russes de Pet911 sont traduites et
relocalisées en Belgique avec conservation des vraies photos.

| Source | Apporte | Espèces |
| --- | --- | --- |
| **The Cat API / The Dog API** | race, tempérament, photo | chats, chiens |
| **Austin Animal Center** (SODA) | race, statut d'adoption, diversité d'espèces | lapins, oiseaux/poules, cochons d'Inde, furets, chèvres… |
| **Pet911** (scraping) | annonces perdu/trouvé (lieu, photo, propriétaire) | — |

Le pipeline (`server/src/etl/`) écrit `data/animals.unified.{json,csv}`. Chaque
source est tentée en direct ; en cas d'échec réseau, un **snapshot committé** prend
le relais (reproductible hors-ligne).

Au moment du `seed`, les lignes sont **réparties selon leur nature** : Pet911
alimente l'onglet *Perdus/Retrouvés* (`lost_reports`), les autres sources
alimentent les *Profils* (`animals`).

## Scripts

### Client

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run preview` — preview du build
- `npm run optimize-images` — convertit les images JPG/PNG en WebP + AVIF (lancé automatiquement avant le build)

### Validation

- `node scripts/validate-html.mjs` — validation HTML W3C (API officielle)
- `node scripts/validate-css.mjs` — validation CSS W3C (API officielle)
- `npx html-validate "dist/**/*.html"` — validation HTML rapide en local
- `npx eslint "src/js/**/*.js"` — validation JavaScript (ESLint)

### Server

- `npm run dev` — serveur Express en mode watch
- `npm run dataset` — (re)génère le dataset unifié (`data/animals.unified.{json,csv}`) depuis les 3 sources
- `npm run seed` — initialise la base SQLite à partir du dataset

## ✅ Validation W3C

Le site est **intégralement valide** selon les normes du W3C :

| Langage | Outil | Résultat |
|---|---|---|
| **HTML** (22 pages) | [Validateur W3C Nu](https://validator.w3.org/nu/) | **0 erreur** |
| **CSS** | [Validateur W3C CSS (Jigsaw)](https://jigsaw.w3.org/css-validator/) | **0 erreur** |
| **JavaScript** | [ESLint](https://eslint.org/) | **0 erreur, 0 warning** |

Les badges de validation sont visibles dans le pied de page de chaque page du site.

## Auteur

Manon Sigaud
