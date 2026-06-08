import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { db } from './database.js';
import { hashPassword } from '../lib/password.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Initialisation des données de test...');

// La table `animals` a évolué (schéma unifié 18 colonnes). On la recrée pour
// migrer les colonnes des bases déjà existantes, puis on réapplique le schéma.
db.exec('DROP TABLE IF EXISTS animals');
db.exec(readFileSync(resolve(__dirname, 'schema.sql'), 'utf-8'));

// Identifiants de démo — à synchroniser avec CREDENTIALS.local.md
const ACCOUNTS = {
  admin: {
    email: 'admin@petsbook.local',
    password: 'Adm!nPetsBook-2026#Secure',
    displayName: 'Administrateur Pet\'s Book',
    role: 'admin',
  },
  client: {
    email: 'client@petsbook.local',
    password: 'Client.Demo-2026!',
    displayName: 'Manon (client démo)',
    role: 'user',
  },
};

const truncate = db.transaction(() => {
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM events');
  db.exec('DELETE FROM lost_reports');
  db.exec('DELETE FROM users');
});
truncate();

const insertUser = db.prepare(
  `INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)`
);

const adminHash  = await hashPassword(ACCOUNTS.admin.password);
const clientHash = await hashPassword(ACCOUNTS.client.password);

const adminId  = insertUser.run(ACCOUNTS.admin.email,  adminHash,  ACCOUNTS.admin.displayName,  ACCOUNTS.admin.role).lastInsertRowid;
const clientId = insertUser.run(ACCOUNTS.client.email, clientHash, ACCOUNTS.client.displayName, ACCOUNTS.client.role).lastInsertRowid;

// Dataset unifié (union des 3 sources), produit par `npm run dataset`.
const datasetPath = resolve(__dirname, '..', '..', '..', 'data', 'animals.unified.json');
const dataset = JSON.parse(readFileSync(datasetPath, 'utf-8'));

// Répartition selon la nature de la donnée :
//  - Pet911 = annonces perdu/trouvé  → table lost_reports (onglet Perdus/Retrouvés)
//  - autres sources = profils d'animaux → table animals
const animals = dataset.filter((a) => a.source !== 'pet911');
const pet911Reports = dataset.filter((a) => a.source === 'pet911');

const insertAnimal = db.prepare(
  `INSERT INTO animals
     (owner_id, animal_id, source, species, breed, breed_secondary, name, age,
      gender, color, physical_desc, temperament, status, owner_name, adopted,
      intake_type, location, image_url, date_listed)
   VALUES
     (@owner_id, @animal_id, @source, @species, @breed, @breed_secondary, @name, @age,
      @gender, @color, @physical_desc, @temperament, @status, @owner_name, @adopted,
      @intake_type, @location, @image_url, @date_listed)`
);

const insertAnimals = db.transaction((rows) => {
  for (const a of rows) {
    insertAnimal.run({
      owner_id: null, // animaux externes : pas de compte propriétaire dans l'app
      animal_id: a.animal_id ?? null,
      source: a.source ?? 'petsbook',
      species: a.species ?? 'autre',
      breed: a.breed ?? null,
      breed_secondary: a.breed_secondary ?? null,
      name: a.name ?? 'Sans nom',
      age: a.age ?? null,
      gender: a.gender ?? null,
      color: a.color ?? null,
      physical_desc: a.physical_desc ?? null,
      temperament: a.temperament ?? null,
      status: a.status ?? null,
      owner_name: a.owner_name ?? null,
      adopted: a.adopted ?? null,
      intake_type: a.intake_type ?? null,
      location: a.location ?? null,
      image_url: a.image_url ?? null,
      date_listed: a.date_listed ?? null,
    });
  }
});
insertAnimals(animals);

const insertEvent = db.prepare(
  `INSERT INTO events (title, description, location, starts_at, image_url) VALUES (?, ?, ?, ?, ?)`
);
insertEvent.run(
  'Balade dans la vallée de la Solière',
  'Promenade nature au départ du parking Elysée-Beaufort, en bordure de forêt. Animaux en laisse bienvenus.',
  'Huy, Belgique',
  '2026-06-15 10:00:00',
  '/images/balade-soliere.jpg'
);
insertEvent.run(
  'Atelier comportementaliste chien',
  'Atelier pratique pour mieux comprendre la communication canine.',
  'Liège, Belgique',
  '2026-07-02 14:00:00',
  '/images/partner-comportementaliste.jpg'
);

const insertProduct = db.prepare(
  `INSERT INTO products (name, description, price_cents, stock, image_url) VALUES (?, ?, ?, ?, ?)`
);
insertProduct.run('Collier en cuir naturel',     'Collier artisanal réglable, fabriqué localement.',         1990, 25, '/images/partner-toutous.jpg');
insertProduct.run('Jouet en corde résistant',    'Idéal pour les chiens joueurs et les séances de tir.',     899,  60, '/images/partner-holidog.jpg');
insertProduct.run('Sac de croquettes bio 5kg',   'Croquettes naturelles sans céréales.',                     3490, 12, '/images/partner-tipaw.jpg');

// Une annonce déjà approuvée + une en attente pour démontrer le workflow admin
const insertLost = db.prepare(
  `INSERT INTO lost_reports (reporter_id, animal_name, species, description, location, lost_date, status, contact, image_url, is_approved, approved_by, approved_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
insertLost.run(clientId, 'Mistigri', 'chat',  'Chat tigré disparu près du parc, collier rouge.',     'Liège, Outremeuse', '2026-05-10', 'lost',  'manon@example.com',   '/images/ginette.jpg', 1, adminId, '2026-05-11 09:00:00');
insertLost.run(clientId, 'Pongo',    'chien', 'Dalmatien aperçu errant, semble perdu, très amical.', 'Huy, centre-ville', '2026-05-20', 'found', 'tel: 0470 00 00 00',  '/images/leon.jpg',    0, null, null);

// Annonces réelles importées de Pet911, pré-approuvées pour être visibles publiquement.
const LOST_SPECIES = new Set(['chat', 'chien', 'lapin', 'oiseau']);
const toLostSpecies = (s) => (LOST_SPECIES.has(s) ? s : 'autre');

const insertPet911Reports = db.transaction((rows) => {
  for (const p of rows) {
    insertLost.run(
      null,
      p.name || 'Animal signalé',
      toLostSpecies(p.species),
      p.physical_desc || p.temperament || 'Annonce importée de Pet911.',
      p.location || 'Russie',
      p.date_listed || '2026-01-01',
      p.status === 'Trouvé' ? 'found' : 'lost',
      p.owner_name ? `${p.owner_name} — via Pet911` : 'Via Pet911',
      p.image_url || null,
      1, adminId, '2026-06-08 00:00:00',
    );
  }
});
insertPet911Reports(pet911Reports);

console.log('Seed terminé.');
console.log(`  - ${animals.length} profils d'animaux (The Cat/Dog API + Austin)`);
console.log(`  - ${pet911Reports.length} annonces perdu/trouvé importées de Pet911`);
console.log(`  - Admin  : ${ACCOUNTS.admin.email}  /  ${ACCOUNTS.admin.password}`);
console.log(`  - Client : ${ACCOUNTS.client.email} /  ${ACCOUNTS.client.password}`);
console.log('  → Identifiants archivés dans CREDENTIALS.local.md (gitignored).');
