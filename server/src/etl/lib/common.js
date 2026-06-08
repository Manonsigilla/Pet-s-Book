// Schéma commun + utilitaires partagés par les adaptateurs ETL.
//
// Principe : « union verticale ». Chaque source produit des lignes au MÊME
// schéma (COLUMNS). Les colonnes qu'une source ne fournit pas restent à null.
// On empile ensuite toutes les lignes et on trace l'origine via la colonne `source`.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Racines de fichiers du pipeline.
export const ETL_DIR = resolve(__dirname, '..');
export const SNAPSHOT_DIR = resolve(ETL_DIR, 'snapshots');
export const DATA_DIR = resolve(ETL_DIR, '..', '..', '..', 'data');

// User-Agent honnête : on s'identifie plutôt que de se faire passer pour un navigateur.
export const USER_AGENT =
  'PetsBook-ETL/1.0 (projet etudiant RNCP; contact: petsbook.local)';

// -----------------------------------------------------------------------------
// Schéma cible (ordre = colonnes du dataset et du CSV)
// -----------------------------------------------------------------------------
export const COLUMNS = [
  'animal_id',       // identifiant d'origine dans la source
  'source',          // thecatapi | thedogapi | dogceo | austin | pet911
  'species',         // normalisée en français : chien|chat|lapin|oiseau|furet|autre
  'breed',
  'breed_secondary',
  'name',
  'age',
  'gender',
  'color',
  'physical_desc',
  'temperament',
  'status',
  'owner_name',
  'adopted',         // 0 | 1 | null
  'intake_type',
  'location',
  'image_url',
  'date_listed',
];

// Crée une ligne vide conforme au schéma, puis applique les valeurs fournies.
// Garantit que toute ligne possède exactement les colonnes attendues.
export function makeRow(values = {}) {
  const row = {};
  for (const col of COLUMNS) row[col] = values[col] ?? null;
  return row;
}

// -----------------------------------------------------------------------------
// Normalisation
// -----------------------------------------------------------------------------

// Ramène les espèces (anglais / russe / français) vers un vocabulaire commun fr.
// Le front filtre sur chat/chien/lapin ; tout le reste tombe dans « autre ».
const SPECIES_MAP = new Map([
  ['dog', 'chien'], ['dogs', 'chien'], ['chien', 'chien'], ['собака', 'chien'],
  ['cat', 'chat'], ['cats', 'chat'], ['chat', 'chat'], ['кошка', 'chat'],
  ['rabbit', 'lapin'], ['lapin', 'lapin'], ['кролик', 'lapin'],
  ['bird', 'oiseau'], ['oiseau', 'oiseau'], ['птица', 'oiseau'],
  ['ferret', 'furet'], ['furet', 'furet'], ['хорёк', 'furet'], ['хорек', 'furet'],
]);

export function normalizeSpecies(raw) {
  if (!raw) return 'autre';
  const key = String(raw).trim().toLowerCase();
  return SPECIES_MAP.get(key) ?? 'autre';
}

// Nettoie un texte : trim, espaces multiples réduits, chaîne vide -> null.
export function clean(value) {
  if (value == null) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s.length ? s : null;
}

// "Spayed Female" / "Мужской" -> "Femelle"/"Mâle" (sinon valeur nettoyée).
export function normalizeGender(raw) {
  const s = clean(raw)?.toLowerCase();
  if (!s) return null;
  if (s.includes('female') || s.includes('женск')) return 'Femelle';
  if (s.includes('male') || s.includes('мужск') || s.includes('кобель')) return 'Mâle';
  return clean(raw);
}

// -----------------------------------------------------------------------------
// HTTP
// -----------------------------------------------------------------------------

export async function httpJson(url, { headers = {}, timeout = 20000 } = {}) {
  const res = await fetchWithTimeout(url, headers, timeout);
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.json();
}

export async function httpText(url, { headers = {}, timeout = 20000 } = {}) {
  const res = await fetchWithTimeout(url, headers, timeout);
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.text();
}

async function fetchWithTimeout(url, headers, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, ...headers },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// -----------------------------------------------------------------------------
// Snapshots — reproductibilité hors-ligne
// -----------------------------------------------------------------------------
//
// Chaque source tente une extraction en direct. Si elle réussit, on met à jour
// le snapshot committé. Si le réseau échoue (API down, scraping bloqué…), on
// relit le dernier snapshot : le pipeline reste reproductible sans réseau.

export async function withSnapshot(name, fetchFn) {
  const file = resolve(SNAPSHOT_DIR, `${name}.json`);
  try {
    const rows = await fetchFn();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('aucune ligne renvoyée');
    }
    await mkdir(SNAPSHOT_DIR, { recursive: true });
    await writeFile(file, JSON.stringify(rows, null, 2), 'utf-8');
    console.log(`  [${name}] ${rows.length} lignes en direct → snapshot mis à jour`);
    return rows;
  } catch (err) {
    if (existsSync(file)) {
      const rows = JSON.parse(await readFile(file, 'utf-8'));
      console.warn(`  [${name}] direct échoué (${err.message}) → snapshot (${rows.length} lignes)`);
      return rows;
    }
    console.error(`  [${name}] direct échoué (${err.message}) et aucun snapshot disponible`);
    return [];
  }
}

// -----------------------------------------------------------------------------
// Sérialisation CSV (sans dépendance)
// -----------------------------------------------------------------------------

export function toCsv(rows, columns = COLUMNS) {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.join(',');
  const body = rows.map((r) => columns.map((c) => escape(r[c])).join(',')).join('\n');
  return `${head}\n${body}\n`;
}
