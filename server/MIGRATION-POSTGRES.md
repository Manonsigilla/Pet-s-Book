# Migration SQLite → PostgreSQL

Ce projet a été préparé pour un déploiement mondial : **toutes les routes passent
par une façade d'accès aux données asynchrone** (`src/db/index.js`). Le jour où
SQLite ne suffit plus (concurrence d'écriture, scaling horizontal, hébergement
managé), la bascule vers PostgreSQL se concentre sur **un seul fichier** + une
courte liste de points SQL documentés ci-dessous.

> Pourquoi pas SQLite en prod mondiale ? SQLite n'autorise qu'**un écrivain à la
> fois** et c'est une base **fichier embarquée** : elle ne se partage pas entre
> plusieurs instances serveur derrière un load-balancer. Ce n'est PAS une
> question de volume (SQLite encaisse des centaines de Go).

---

## 1. Le cœur : réécrire `src/db/index.js`

Les routes appellent `db.prepare(sql).get/all/run(...)` et `db.transaction(fn)`
en `await`. Il suffit de fournir la même interface au-dessus du driver `pg` :

```js
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Traduit les placeholders « ? » de SQLite en « $1, $2, … » de PostgreSQL.
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function statement(sql) {
  const text = toPg(sql);
  return {
    async get(...params) { return (await pool.query(text, params)).rows[0]; },
    async all(...params) { return (await pool.query(text, params)).rows; },
    async run(...params) {
      const r = await pool.query(text, params);
      return { changes: r.rowCount, lastInsertRowid: r.rows[0]?.id };
    },
  };
}

export const db = {
  prepare: statement,
  transaction(fn) {
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(...args);   // ⚠️ voir note transactions ci-dessous
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
  },
};
```

> Note transactions : pour être réellement isolées, les requêtes du callback
> doivent passer par le `client` emprunté (et non par le pool global). Au besoin,
> faire en sorte que `db.transaction` injecte un `db` lié à ce `client`. Les 3
> transactions concernées sont toutes dans `src/routes/orders.js`.

## 2. Traduire le schéma (`src/db/schema.sql`)

| SQLite | PostgreSQL |
| --- | --- |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `GENERATED ALWAYS AS IDENTITY` (ou `SERIAL`) |
| `INTEGER` utilisé comme booléen (0/1) | `BOOLEAN` (ou garder `SMALLINT`) |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT now()` |
| `TEXT` | `TEXT` (inchangé) |
| `CHECK (...)`, `UNIQUE (...)`, `REFERENCES` | inchangés (compatibles) |

Les `CREATE INDEX IF NOT EXISTS …` sont compatibles tels quels.

## 3. Les rares spécificités SQL dans les routes

Ces points sont les SEULS éléments dialecte-spécifiques restant dans les routes
(tout le reste — placeholders `?`, `ON CONFLICT … DO UPDATE`, sous-requêtes,
`COALESCE`, `CASE` — est portable) :

| Fichier | À adapter | Équivalent PostgreSQL |
| --- | --- | --- |
| `routes/animals.js` (×2) | `ORDER BY a.name COLLATE NOCASE` | `ORDER BY lower(a.name)` (ou type `citext`) |
| `routes/animals.js` | `ORDER BY RANDOM()` | `RANDOM()` existe aussi — OK |
| `routes/events.js`, `routes/posts.js` | `datetime('now')` | `now()` |
| paramètres nommés `@me`, `@from`, `@to`, `@a`, `@b` (conversations, friends) | spécifiques better-sqlite3 | repasser en positionnels `?`, ou gérer la traduction des noms dans `toPg` |
| `lastInsertRowid` (inserts) | id renvoyé via `RETURNING id` | ajouter `RETURNING id` aux `INSERT` et lire `rows[0].id` dans `run()` |

## 4. Le seed (`src/db/seed.js`)

`seed.js` utilise encore better-sqlite3 en direct (API synchrone + transactions
natives). C'est un **outil de développement** (peuplement de la base de démo),
hors runtime servi aux utilisateurs. À porter une seule fois lors de la bascule
(le passer en async via la façade, ou écrire un seed dédié PostgreSQL).

## 5. Dépendances & config

- `npm i pg` ; retirer `better-sqlite3` une fois la bascule terminée.
- Variable d'env `DATABASE_URL` (fournie par Neon, Supabase, Railway…).
- Garder `src/db/database.js` (SQLite) tant que les deux moteurs coexistent en
  dev, ou le supprimer après bascule complète.

---

### Ce qui ne bouge PAS

Les **12 fichiers de routes**, déjà écrits en `async/await` via la façade, n'ont
pas à être réécrits pour le passage à PostgreSQL (hors les rares points du §3).
C'est tout l'intérêt de la couche d'accès : le moteur est interchangeable.
