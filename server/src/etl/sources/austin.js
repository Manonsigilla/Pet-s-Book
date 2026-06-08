// Source #2 — Austin Animal Center (Socrata Open Data API, SODA).
//
// Rôle : race ✅, caractère ❌, image ❌, statut adoption ✅.
// Apporte aussi la DIVERSITÉ d'espèces (lapins, poules, cochons d'Inde, chèvres…)
// que les catalogues chats/chiens ne couvrent pas.
//
//   - Outcomes (9t4d-g238) : statut de sortie (Adoption, Transfer…) → status/adopted
//   - Intakes  (wter-evkm) : type et lieu d'entrée → intake_type/location
//
// L'espèce réelle est dérivée de la race (ex. animal_type 'Bird' + breed 'Chicken'
// → poule). On exclut la faune sauvage récupérée par le refuge (ratons, opossums…).
//
// Sans clé. Jeton optionnel via .env : SODA_APP_TOKEN (monte les quotas).

import { httpJson, makeRow, clean, normalizeGender } from '../lib/common.js';

const OUTCOMES = 'https://data.austintexas.gov/resource/9t4d-g238.json';
const INTAKES = 'https://data.austintexas.gov/resource/wter-evkm.json';

// Requêtes ciblées pour garantir une vraie variété d'espèces dans le résultat.
// like = motif SoQL sur la colonne breed (null = pas de filtre de race).
const QUERIES = [
  { type: 'Dog', like: null, limit: 22 },
  { type: 'Cat', like: null, limit: 22 },
  { type: 'Other', like: 'Rabbit%', limit: 12 },
  { type: 'Other', like: 'Guinea Pig%', limit: 6 },
  { type: 'Other', like: 'Ferret%', limit: 4 },
  { type: 'Other', like: 'Hamster%', limit: 4 },
  { type: 'Other', like: 'Hedgehog%', limit: 2 },
  { type: 'Bird', like: 'Chicken%', limit: 8 },
  { type: 'Bird', like: 'Duck%', limit: 5 },
  { type: 'Bird', like: 'Parakeet%', limit: 4 },
  { type: 'Bird', like: 'Cockatiel%', limit: 3 },
  { type: 'Livestock', like: 'Pig%', limit: 4 },
  { type: 'Livestock', like: 'Potbelly Pig%', limit: 2 },
  { type: 'Livestock', like: 'Goat%', limit: 3 },
];

export async function fetchAustin() {
  const headers = process.env.SODA_APP_TOKEN ? { 'X-App-Token': process.env.SODA_APP_TOKEN } : {};

  const batches = await Promise.all(QUERIES.map((q) => fetchOutcomes(q, headers)));
  const outcomes = batches.flat();

  // Jointure Intakes : intake_type + lieu pour les mêmes animaux.
  const ids = outcomes.map((o) => o.animal_id).filter(Boolean);
  const intakeById = await fetchIntakes(ids, headers);

  return outcomes
    .map((o) => {
      const species = deriveSpecies(o.animal_type, o.breed);
      if (!species) return null; // faune sauvage / espèce non gérée → ignorée
      const intake = intakeById.get(o.animal_id);
      const [breed, breedSecondary] = formatBreed(o.breed, species);
      return makeRow({
        animal_id: o.animal_id,
        source: 'austin',
        species,
        breed,
        breed_secondary: breedSecondary,
        name: clean(o.name) ?? 'Sans nom',
        age: clean(o.age_upon_outcome),
        gender: normalizeGender(o.sex_upon_outcome),
        color: clean(o.color),
        status: clean(o.outcome_type),
        adopted: o.outcome_type === 'Adoption' ? 1 : 0,
        intake_type: clean(intake?.intake_type),
        location: clean(intake?.found_location),
        date_listed: o.datetime ? o.datetime.slice(0, 10) : null,
      });
    })
    .filter(Boolean);
}

async function fetchOutcomes({ type, like, limit }, headers) {
  let where = `animal_type='${type}' AND name IS NOT NULL`;
  if (like) where += ` AND breed like '${like}'`;
  const params = new URLSearchParams({ $where: where, $order: 'datetime DESC', $limit: String(limit) });
  return httpJson(`${OUTCOMES}?${params}`, { headers });
}

async function fetchIntakes(ids, headers) {
  const map = new Map();
  if (ids.length === 0) return map;
  const inList = ids.map((id) => `'${id}'`).join(',');
  const params = new URLSearchParams({ $where: `animal_id in(${inList})`, $limit: String(ids.length * 2) });
  const intakes = await httpJson(`${INTAKES}?${params}`, { headers });
  for (const it of intakes) {
    if (!map.has(it.animal_id)) map.set(it.animal_id, it);
  }
  return map;
}

// Déduit une espèce française à partir du type Austin et de la race.
// Renvoie null pour la faune sauvage (à ne pas afficher comme animal de compagnie).
function deriveSpecies(animalType, breed) {
  const t = (animalType || '').toLowerCase();
  const b = (breed || '').toLowerCase();
  if (t === 'dog') return 'chien';
  if (t === 'cat') return 'chat';
  if (t === 'bird') return 'oiseau';
  if (t === 'livestock') return b.includes('emu') ? 'oiseau' : 'autre';
  // animal_type 'Other' : on ne garde que les NAC domestiques
  if (b.includes('rabbit')) return 'lapin';
  if (/guinea pig|hamster|ferret|hedgehog|chinchilla|gerbil/.test(b)) return 'autre';
  return null;
}

// Traductions FR des races « génériques » des NAC / volailles / bétail.
const BREED_FR = [
  [/rabbit sh/i, 'Lapin (poil court)'], [/rabbit lh/i, 'Lapin (poil long)'], [/rabbit/i, 'Lapin'],
  [/guinea pig/i, "Cochon d'Inde"], [/hamster/i, 'Hamster'], [/ferret/i, 'Furet'], [/hedgehog/i, 'Hérisson'],
  [/chicken/i, 'Poule'], [/duck/i, 'Canard'], [/parakeet/i, 'Perruche'], [/cockatiel/i, 'Calopsitte'],
  [/dove/i, 'Colombe'], [/pigeon/i, 'Pigeon'], [/emu/i, 'Émeu'],
  [/potbelly pig/i, 'Cochon nain'], [/\bpig\b/i, 'Cochon'], [/goat/i, 'Chèvre'], [/sheep/i, 'Mouton'],
];

// Pour chiens/chats : on garde la vraie race (split primaire/secondaire sur « / »).
// Pour les autres espèces : on traduit la race générique en français.
function formatBreed(raw, species) {
  const s = clean(raw);
  if (!s) return [null, null];
  if (species === 'chien' || species === 'chat') {
    const parts = s.split('/').map((p) => p.trim()).filter(Boolean);
    return [parts[0] ?? null, parts[1] ?? null];
  }
  for (const [pattern, fr] of BREED_FR) {
    if (pattern.test(s)) return [fr, null];
  }
  return [s, null];
}
