// Source #4 — Images par espèce pour les animaux Austin sans photo.
//
// Rôle : pallier l'absence d'images dans Austin pour les espèces non couvertes
// par The Cat/Dog API (lapins, oiseaux, rongeurs, animaux de ferme…).
//
// Éco-conception :
//   - 1 appel API par groupe d'espèce (pas par animal)
//   - Snapshot disque → jamais re-fetché si le réseau est indisponible
//   - Licence CC0 (domaine public), pas d'attribution obligatoire
//   - Les URLs distantes ne pèsent pas sur notre serveur
//
// API Openverse (WordPress) — gratuite, sans clé, sans quota strict.

import { httpJson, sleep } from '../lib/common.js';

const BASE = 'https://api.openverse.org/v1/images/';
const DELAY = 250; // ms entre 2 appels (politesse)

// Groupe d'espèce → requête de recherche sur Openverse.
// On groupe les races proches pour minimiser les appels (1 image par groupe).
const SPECIES_QUERIES = [
  { group: 'lapin',            q: 'rabbit pet',         breeds: ['Lapin', 'Lapin (poil court)', 'Lapin (poil long)'] },
  { group: 'cochon-dinde',     q: 'guinea pig pet',     breeds: ["Cochon d'Inde"] },
  { group: 'hamster',          q: 'hamster pet',        breeds: ['Hamster'] },
  { group: 'furet',            q: 'ferret animal',      breeds: ['Furet'] },
  { group: 'herisson',         q: 'hedgehog animal',    breeds: ['Hérisson'] },
  { group: 'cochon',           q: 'pig farm animal',    breeds: ['Cochon', 'Cochon nain'] },
  { group: 'chevre',           q: 'goat farm animal',   breeds: ['Chèvre'] },
  { group: 'poule',            q: 'chicken farm',       breeds: ['Poule'] },
  { group: 'canard',           q: 'duck farm bird',     breeds: ['Canard'] },
  { group: 'perruche',         q: 'parakeet pet bird',  breeds: ['Perruche', 'Calopsitte'] },
];

/**
 * Récupère les images par groupe d'espèce depuis Openverse.
 * Retourne un tableau d'objets {breed, imageUrl} compatible withSnapshot.
 */
export async function fetchSpeciesImages() {
  const results = [];

  for (const { group, q, breeds } of SPECIES_QUERIES) {
    let imageUrl = null;
    try {
      const data = await httpJson(
        `${BASE}?q=${encodeURIComponent(q)}&license=cc0&page_size=1&mature=false`,
      );
      imageUrl = data.results?.[0]?.url ?? null;
      if (imageUrl) {
        console.log(`  [species-images] ${group.padEnd(16)} → ${imageUrl.split('/').pop()}`);
      } else {
        console.warn(`  [species-images] ${group.padEnd(16)} → aucune image trouvée`);
      }
    } catch (err) {
      console.warn(`  [species-images] ${group.padEnd(16)} → échec (${err.message})`);
    }

    // Associe l'URL à chaque race du groupe (permet la correspondance exacte).
    // N'ajoute que si l'image a bien été récupérée (évite de cacher des null).
    if (imageUrl) {
      for (const breed of breeds) {
        results.push({ breed, imageUrl });
      }
    }

    await sleep(DELAY);
  }

  return results;
}
