// =============================================================================
// Façade d'accès aux données — interface ASYNCHRONE et agnostique du moteur.
//
// Toutes les routes passent par cette façade (jamais par better-sqlite3
// directement). Elle imite l'API de better-sqlite3 (`prepare().get/all/run`)
// mais en asynchrone, pour préparer le déploiement mondial :
//
//   • Aujourd'hui  : adaptateur SQLite (synchrone sous le capot, exposé en async).
//   • Demain       : pour passer à PostgreSQL (concurrence d'écriture + scaling
//                    horizontal), il suffit de réécrire CE SEUL fichier avec le
//                    driver `pg` — les routes, déjà en async/await, ne bougent pas.
//
// Voir server/MIGRATION-POSTGRES.md pour la checklist de bascule.
// =============================================================================
import { db as sqlite } from './database.js';

// Un « statement » asynchrone. On transmet les paramètres tels quels à
// better-sqlite3, ce qui prend en charge aussi bien les paramètres positionnels
// (`?`) que nommés (`@nom`, objet unique).
function statement(sql) {
  const stmt = sqlite.prepare(sql);
  return {
    // Première ligne (ou undefined).
    async get(...params) {
      return stmt.get(...params);
    },
    // Toutes les lignes (tableau).
    async all(...params) {
      return stmt.all(...params);
    },
    // INSERT / UPDATE / DELETE. Renvoie { changes, lastInsertRowid }.
    async run(...params) {
      const info = stmt.run(...params);
      return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
    },
  };
}

export const db = {
  // Prépare une requête. Usage identique à better-sqlite3, mais les méthodes
  // get/all/run renvoient des promesses :
  //   const row  = await db.prepare('SELECT ... WHERE id = ?').get(id);
  //   const rows = await db.prepare('SELECT ...').all();
  //   const res  = await db.prepare('INSERT ...').run(a, b);  // res.lastInsertRowid
  prepare(sql) {
    return statement(sql);
  },

  // Transaction tout-ou-rien. Renvoie une fonction asynchrone à appeler.
  //   const buy = db.transaction(async () => { ... await db.prepare(...).run(...) ... });
  //   const id = await buy();
  //
  // Contrainte : à l'intérieur du callback, n'attendre QUE des opérations base
  // (pas d'I/O réseau/fichier), car la connexion SQLite est unique et partagée.
  // Côté PostgreSQL, cette méthode deviendra un BEGIN/COMMIT sur un client dédié.
  transaction(fn) {
    return async (...args) => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(...args);
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        try { sqlite.exec('ROLLBACK'); } catch { /* connexion déjà rétablie */ }
        throw err;
      }
    };
  },
};
