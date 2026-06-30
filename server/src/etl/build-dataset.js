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
import { fetchSpeciesImages } from './sources/species-images.js';

// ---------------------------------------------------------------------------
// Enrichissement des images : pour chaque ligne SANS image (Austin), on tente
// une correspondance sur la race avec le catalogue Cat/Dog API. Si aucune race
// ne correspond, on attribue une image aléatoire de la même espèce.
// ---------------------------------------------------------------------------
function enrichImages(allRows, catalogRows, speciesImageMap) {
  // Index : espèce -> [image_url, ...] (depuis le catalogue, qui a des images)
  const speciesPool = {};
  // Index : espèce -> race normalisée -> image_url
  const breedIndex = {};

  for (const row of catalogRows) {
    if (!row.image_url) continue;
    const sp = row.species;
    if (!speciesPool[sp]) speciesPool[sp] = [];
    speciesPool[sp].push(row.image_url);

    if (row.breed) {
      if (!breedIndex[sp]) breedIndex[sp] = {};
      const normBreed = normalizeBreed(row.breed);
      if (!breedIndex[sp][normBreed]) breedIndex[sp][normBreed] = row.image_url;
    }
  }

  // Pour chaque ligne sans image, on essaie de trouver une correspondance.
  for (const row of allRows) {
    if (row.image_url) continue; // a déjà une image
    if (row.source === 'pet911') continue; // Pet911 a déjà ses propres images

    const sp = row.species;
    const pool = speciesPool[sp];

    // 1) Correspondance de race dans le catalogue Cat/Dog API (chiens, chats).
    if (pool && pool.length > 0 && row.breed && breedIndex[sp]) {
      const matched = matchBreed(row.breed, breedIndex[sp]);
      if (matched) {
        row.image_url = matched;
        continue;
      }
      // Pas de correspondance exacte : image aléatoire de la même espèce.
      row.image_url = pool[Math.floor(Math.random() * pool.length)];
      continue;
    }

    // 2) Espèces non-chat/chien (lapin, oiseau, rongeur…) : image par race
    //    depuis le catalogue Openverse (une image par groupe de race).
    if (row.breed && speciesImageMap.has(row.breed)) {
      row.image_url = speciesImageMap.get(row.breed);
      continue;
    }

    // 3) Dernier recours : si l'espèce a un pool (chat/chien sans race), piocher.
    if (pool && pool.length > 0) {
      row.image_url = pool[Math.floor(Math.random() * pool.length)];
    }
  }
}

// Normalise un nom de race pour la comparaison.
function normalizeBreed(breed) {
  return breed
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]/gi, '')                         // retire la ponctuation/espaces
    .toLowerCase();
}

// Cherche une correspondance de race : exacte d'abord, puis partielle
// (une des races contient l'autre).
function matchBreed(breed, breedIndex) {
  const norm = normalizeBreed(breed);
  // Exact
  if (breedIndex[norm]) return breedIndex[norm];

  // Partiel : la race Austin contient une race du catalogue, ou l'inverse.
  for (const [catalogBreed, imageUrl] of Object.entries(breedIndex)) {
    if (norm.includes(catalogBreed) || catalogBreed.includes(norm)) {
      return imageUrl;
    }
  }
  return null;
}

async function main() {
  console.log('Construction du dataset unifié...\n');

  // Extraction (les sources indépendantes tournent en parallèle).
  const [dogcat, austin, pet911, speciesImages] = await Promise.all([
    withSnapshot('dogcat', fetchDogCat),
    withSnapshot('austin', fetchAustin),
    withSnapshot('pet911', fetchPet911),
    withSnapshot('species-images', fetchSpeciesImages),
  ]);

  // Index breed → image_url pour les espèces non-chat/chien.
  const speciesImageMap = new Map(speciesImages.map(({ breed, imageUrl }) => [breed, imageUrl]));

  // Union verticale : on empile, on trace l'origine via la colonne `source`.
  const raw = [...dogcat, ...austin, ...pet911];

  // ---------------------------------------------------------------------------
  // Enrichissement : les entrées Austin n'ont pas d'images. Pour les chiens et
  // chats, on récupère l'image de la race correspondante depuis le catalogue
  // Cat/Dog API. Pour les autres espèces (lapins, oiseaux, rongeurs…), on
  // utilise les images CC0 d'Openverse, une par groupe d'espèce.
  // ---------------------------------------------------------------------------
  enrichImages(raw, dogcat, speciesImageMap);

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
