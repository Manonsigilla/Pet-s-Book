import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || resolve(__dirname, 'petsbook.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
// Attend jusqu'à 5 s qu'un verrou se libère au lieu d'échouer immédiatement
// (SQLite ne tolère qu'un écrivain à la fois — utile dès qu'il y a un peu de concurrence).
db.pragma('busy_timeout = 5000');

// Applique le schéma à la création
const schema = readFileSync(resolve(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);
