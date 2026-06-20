// Pipeline ETL — union verticale des 3 sources vers un dataset unifié.
//
//   Extraction (par source, schéma commun)
//        │
//        ▼
//   Union verticale  →  data/animals.unified.json  +  .csv
//
// Chaque source est tentée en direct ; en cas d'échec réseau, on relit le
// snapshot committé (cf. withSnapshot). Lancer : `npm run dataset`.

import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { COLUMNS, DATA_DIR, toCsv, withSnapshot } from './lib/common.js';
import { translateRows } from './lib/translate.js';
import { fetchDogCat } from './sources/dogcat.js';
import { fetchAustin } from './sources/austin.js';
import { fetchPet911 } from './sources/pet911.js';

async function main() {
  console.log('Construction du dataset unifié...\n');

  // Extraction (les sources indépendantes tournent en parallèle).
  const [dogcat, austin, pet911] = await Promise.all([
    withSnapshot('dogcat', fetchDogCat),
    withSnapshot('austin', fetchAustin),
    withSnapshot('pet911', fetchPet911),
  ]);

  // Union verticale : on empile, on trace l'origine via la colonne `source`.
  const raw = [...dogcat, ...austin, ...pet911];

  // Post-traitement : traduction EN/RU → FR et remplacement des annonces russes.
  const unified = translateRows(raw);

  await mkdir(DATA_DIR, { recursive: true });
  const jsonPath = resolve(DATA_DIR, 'animals.unified.json');
  const csvPath = resolve(DATA_DIR, 'animals.unified.csv');
  await writeFile(jsonPath, JSON.stringify(unified, null, 2), 'utf-8');
  await writeFile(csvPath, toCsv(unified, COLUMNS), 'utf-8');

  // Récapitulatif par source.
  const bySource = unified.reduce((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});

  console.log('\nDataset unifié écrit :');
  console.log(`  - ${jsonPath}`);
  console.log(`  - ${csvPath}`);
  console.log(`\n  Total : ${unified.length} animaux`);
  for (const [src, n] of Object.entries(bySource)) {
    console.log(`    • ${src.padEnd(12)} ${n}`);
  }
}

main().catch((err) => {
  console.error('Échec du pipeline :', err);
  process.exit(1);
});
