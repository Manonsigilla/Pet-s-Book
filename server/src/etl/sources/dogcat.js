// Source #1 — remplace l'API PetFinder (fermée le 02/12/2025).
//
// Rôle : race ✅, caractère ✅, image ✅, propriétaire ❌.
// Chaque ligne = une RACE (catalogue), pas un animal individuel.
//
//   - Chats : The Cat API   /v1/breeds          (tempérament + image, sans clé)
//   - Chiens: The Dog API   /v1/breeds          (idem ; clé optionnelle)
//             repli dog.ceo /breeds/list/all    (races + images réelles, sans
//                                                 tempérament) si l'API est bloquée
//
// Clés optionnelles via .env : THECATAPI_KEY, THEDOGAPI_KEY (montent les quotas).

import { httpJson, makeRow, clean, sleep } from '../lib/common.js';

const CAT_LIMIT = 20;
const DOG_LIMIT = 20;

export async function fetchDogCat() {
  const rows = [];
  rows.push(...(await fetchCats()));
  rows.push(...(await fetchDogs()));

  // Validation éco-conception : vérifier que les URLs d'images sont accessibles.
  // Certaines images CDN peuvent disparaître (ex. O3btzLlsO supprimée par CloudFront).
  // On teste chaque URL avec un HEAD ; les cassées sont remplacées par une image
  // valide de la même espèce piochée dans le même lot.
  await validateImages(rows);

  return rows;
}

// Valide les URLs d'images et remplace les cassées (HTTP 403/404) par une image
// valide de la même espèce. Deux passes : collecte des URLs valides, puis remplacement.
async function validateImages(rows) {
  // Passe 1 : collecter les URLs valides par espèce (HEAD en parallèle).
  const imageRows = rows.filter((r) => r.image_url);
  const checks = await Promise.all(
    imageRows.map(async (row) => {
      try {
        const res = await fetch(row.image_url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        return { row, ok: res.ok };
      } catch {
        return { row, ok: false };
      }
    }),
  );

  const validBySpecies = {};
  const broken = [];
  for (const { row, ok } of checks) {
    if (ok) {
      if (!validBySpecies[row.species]) validBySpecies[row.species] = [];
      validBySpecies[row.species].push(row.image_url);
    } else {
      broken.push(row);
    }
  }

  if (broken.length === 0) return;
  console.warn(`  [dogcat] ${broken.length} image(s) cassée(s) → remplacement`);

  // Passe 2 : remplacer les cassées par une image valide de la même espèce.
  for (const row of broken) {
    const pool = validBySpecies[row.species];
    if (pool && pool.length > 0) {
      row.image_url = pool[Math.floor(Math.random() * pool.length)];
    } else {
      row.image_url = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Chats — The Cat API
// ---------------------------------------------------------------------------
async function fetchCats() {
  const headers = process.env.THECATAPI_KEY ? { 'x-api-key': process.env.THECATAPI_KEY } : {};
  const breeds = await httpJson('https://api.thecatapi.com/v1/breeds', { headers });

  return breeds.slice(0, CAT_LIMIT).map((b) =>
    makeRow({
      animal_id: `cat-${b.id}`,
      source: 'thecatapi',
      species: 'chat',
      breed: clean(b.name),
      name: clean(b.name),
      temperament: clean(b.temperament),
      physical_desc: clean(b.description),
      location: clean(b.origin),
      // Sans clé, l'API ne renvoie pas l'objet image : on reconstruit l'URL CDN.
      image_url: b.reference_image_id
        ? `https://cdn2.thecatapi.com/images/${b.reference_image_id}.jpg`
        : b.image?.url ?? null,
    }),
  );
}

// ---------------------------------------------------------------------------
// Chiens — The Dog API, repli dog.ceo
// ---------------------------------------------------------------------------
async function fetchDogs() {
  const headers = process.env.THEDOGAPI_KEY ? { 'x-api-key': process.env.THEDOGAPI_KEY } : {};
  try {
    const breeds = await httpJson('https://api.thedogapi.com/v1/breeds', { headers });
    return breeds.slice(0, DOG_LIMIT).map((b) =>
      makeRow({
        animal_id: `dog-${b.id}`,
        source: 'thedogapi',
        species: 'chien',
        breed: clean(b.name),
        breed_secondary: clean(b.breed_group),
        name: clean(b.name),
        temperament: clean(b.temperament),
        physical_desc: clean(b.bred_for),
        image_url: b.image?.url
          ?? (b.reference_image_id ? `https://cdn2.thedogapi.com/images/${b.reference_image_id}.jpg` : null),
      }),
    );
  } catch (err) {
    console.warn(`  [dogcat] The Dog API indisponible (${err.message}) → repli dog.ceo`);
    return fetchDogsCeo();
  }
}

// Repli : dog.ceo fournit la liste des races et de vraies photos, mais pas de
// tempérament — la colonne reste donc vide (logique d'union assumée).
async function fetchDogsCeo() {
  const { message } = await httpJson('https://dog.ceo/api/breeds/list/all');
  const breeds = Object.keys(message).slice(0, DOG_LIMIT);
  const rows = [];
  for (const breed of breeds) {
    let imageUrl = null;
    try {
      const r = await httpJson(`https://dog.ceo/api/breed/${breed}/images/random`);
      imageUrl = r.message ?? null;
    } catch {
      // image indisponible : on garde la ligne sans photo
    }
    rows.push(
      makeRow({
        animal_id: `dogceo-${breed}`,
        source: 'dogceo',
        species: 'chien',
        breed: breed.charAt(0).toUpperCase() + breed.slice(1),
        name: breed.charAt(0).toUpperCase() + breed.slice(1),
        image_url: imageUrl,
      }),
    );
    await sleep(120); // poli envers dog.ceo
  }
  return rows;
}
