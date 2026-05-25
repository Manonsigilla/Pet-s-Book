import 'dotenv/config';
import { db } from './database.js';
import { hashPassword } from '../lib/password.js';

console.log('Initialisation des données de test...');

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
  db.exec('DELETE FROM animals');
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

const insertAnimal = db.prepare(
  `INSERT INTO animals (owner_id, name, species, breed, birth_year, description, image_url)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
insertAnimal.run(clientId, 'César',              'chat',  'Européen',         2019, 'Roi de la sieste au soleil.',          '/images/cesar.jpg');
insertAnimal.run(clientId, 'Léon',               'chien', 'Golden Retriever', 2021, 'Énergie débordante et joie de vivre.', '/images/leon.jpg');
insertAnimal.run(clientId, 'Lily',               'lapin', 'Nain bélier',      2022, 'Petite exploratrice du jardin.',       '/images/lily.jpg');
insertAnimal.run(clientId, 'Ginette',            'chat',  'Tigrée',           2020, 'Discrète mais très affectueuse.',      '/images/ginette.jpg');
insertAnimal.run(clientId, 'Bubulle et Bouboule', 'autre', 'Poissons rouges', 2023, 'Le duo inséparable de l\'aquarium.',   '/images/bubulle-bouboule.jpg');

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

console.log('Seed terminé.');
console.log(`  - Admin  : ${ACCOUNTS.admin.email}  /  ${ACCOUNTS.admin.password}`);
console.log(`  - Client : ${ACCOUNTS.client.email} /  ${ACCOUNTS.client.password}`);
console.log('  → Identifiants archivés dans CREDENTIALS.local.md (gitignored).');
