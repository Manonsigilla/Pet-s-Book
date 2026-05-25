# Pet's Book

Plateforme de réseau social et d'entraide pour animaux domestiques. Projet de certification RNCP 37273 — Développeur web fullstack.

## Stack technique

- **Front** : Vite, SCSS (architecture 7-1), JavaScript ES6 modules
- **Back** : Node.js, Express, SQLite (better-sqlite3), bcrypt
- **Déploiement** : Netlify (front) + Render (back)

## Structure du projet

```text
pets-book/
├── client/         # Front-end Vite + SCSS
├── server/         # Back-end Express + SQLite
└── _legacy/        # Ancien projet (référence uniquement)
```

## Installation

```bash
# Front
cd client
npm install
npm run dev

# Back (dans un autre terminal)
cd server
npm install
npm run dev
```

## Scripts

### Client

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run preview` — preview du build

### Server

- `npm run dev` — serveur Express en mode watch
- `npm run seed` — initialise la base SQLite avec des données de test

## Auteur

Manon Sigaud
