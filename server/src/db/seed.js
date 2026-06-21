import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { db } from './database.js';
import { hashPassword } from '../lib/password.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Initialisation des données de test...');

// Plusieurs tables ont évolué (animals enrichie, pages avec abonnement, listings
// avec vendeur pro, réactions...). On supprime ces tables et celles qui les
// référencent (dépendants d'abord, à cause des clés étrangères), puis on
// réapplique le schéma à jour. Les autres tables sont juste vidées plus bas.
db.exec('DROP TABLE IF EXISTS reactions');
db.exec('DROP TABLE IF EXISTS posts');
db.exec('DROP TABLE IF EXISTS friendships');
db.exec('DROP TABLE IF EXISTS chat_messages');
db.exec('DROP TABLE IF EXISTS conversations');
db.exec('DROP TABLE IF EXISTS orders');
db.exec('DROP TABLE IF EXISTS listing_images');
db.exec('DROP TABLE IF EXISTS listings');
db.exec('DROP TABLE IF EXISTS lost_tips');
db.exec('DROP TABLE IF EXISTS lost_reports');
db.exec('DROP TABLE IF EXISTS pages');
db.exec('DROP TABLE IF EXISTS animals');
db.exec(readFileSync(resolve(__dirname, 'schema.sql'), 'utf-8'));

// Identifiants de démo — à synchroniser avec CREDENTIALS.local.md
// Mots de passe lus depuis l'environnement (.env, non commité). Les valeurs de
// repli ne servent qu'à un clone sans .env et doivent être changées localement.
const ACCOUNTS = {
  admin: {
    email: 'admin@petsbook.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe-Admin-2026!',
    displayName: 'Administrateur Pet\'s Book',
    role: 'admin',
  },
  client: {
    email: 'client@petsbook.local',
    password: process.env.SEED_CLIENT_PASSWORD || 'ChangeMe-Client-2026!',
    displayName: 'Manon (client démo)',
    role: 'user',
  },
};

const truncate = db.transaction(() => {
  db.exec('DELETE FROM pages');
  db.exec('DELETE FROM chat_messages');
  db.exec('DELETE FROM conversations');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM listing_images');
  db.exec('DELETE FROM listings');
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM events');
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
const animals = dataset.filter((a) => a.source !== 'pet911' && a.source !== 'petsbook');
const pet911Reports = dataset.filter((a) => a.source === 'pet911' || a.source === 'petsbook');

// -----------------------------------------------------------------------------
// Communauté fictive : les animaux importés deviennent de VRAIS profils.
//  - chaque animal reçoit un prénom (les catalogues de races n'en ont pas) ;
//  - chaque animal appartient à un compte utilisateur fictif (un compte peut
//    porter plusieurs profils, comme un vrai membre multi-animaux) ;
//  - volet sensibilisation : statut identifié / stérilisé, avec justification
//    plausible quand la réponse est non.
// Générateur pseudo-aléatoire DÉTERMINISTE : le seed produit toujours la même base.
// -----------------------------------------------------------------------------

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260611);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const FICTIONAL_OWNERS = [
  'Sophie Martin', 'Lucas Dubois', 'Emma Lefebvre', 'Hugo Moreau', 'Léa Bernard',
  'Nathan Petit', 'Chloé Durand', 'Tom Leroy', 'Inès Fontaine', 'Louis Garnier',
  'Camille Roux', 'Jules Lambert', 'Sarah Vincent', 'Maxime Henry', 'Julie Masson',
  'Antoine Gérard', 'Laura Simon', 'Quentin Robert', 'Marie Claes', 'Romain Peeters',
  'Élise Janssens', 'Thomas Maes', 'Amélie Wouters', 'Nicolas Dewulf',
];

const PET_NAMES = [
  'Arthur', 'Bella', 'Biscotte', 'Caramel', 'Câline', 'Charly', 'Chaussette', 'Chipie',
  'Choco', 'Cookie', 'Daisy', 'Diego', 'Domino', 'Éclair', 'Falco', 'Félix', 'Filou',
  'Fleur', 'Frimousse', 'Gaufrette', 'Gribouille', 'Grisou', 'Guimauve', 'Haribo',
  'Hercule', 'Hermine', 'Holly', 'Iris', 'Jazz', 'Joy', 'Juno', 'Kiwi', 'Kira', 'Léo',
  'Lila', 'Lola', 'Louna', 'Lucky', 'Maya', 'Mia', 'Milo', 'Minette', 'Mirza', 'Moka',
  'Mousse', 'Nala', 'Neige', 'Noisette', 'Nougat', 'Nova', 'Oscar', 'Pacha', 'Paprika',
  'Pelote', 'Pépito', 'Perle', 'Pixel', 'Plume', 'Pompon', 'Praline', 'Réglisse', 'Rio',
  'Rocky', 'Romy', 'Ruby', 'Simba', 'Sushi', 'Tango', 'Théo', 'Titi', 'Truffe',
  'Vanille', 'Velours', 'Voyou', 'Ziggy', 'Zoé',
];

const IDENTIFIED_REASONS = [
  'Adopté récemment, le rendez-vous vétérinaire est déjà pris.',
  'Animal recueilli, les démarches d\'identification sont en cours.',
  'Je ne savais pas que c\'était obligatoire, je me renseigne.',
  'Pas encore eu le temps, c\'est prévu ce mois-ci.',
];

const STERILIZED_REASONS = [
  'Trop jeune pour l\'instant',
  'Contre-indication médicale',
  'Projet de reproduction responsable',
  'Vit exclusivement en intérieur',
  'Autre raison : en réflexion avec mon vétérinaire',
];

// Comptes fictifs : personne ne s'y connecte → un seul hash partagé (mot de passe aléatoire).
const fictionalHash = await hashPassword(`fictif-${Date.now()}-Zz9!`);
const fictionalIds = FICTIONAL_OWNERS.map((fullName) => {
  const email = `${fullName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '.')}@exemple.be`;
  return insertUser.run(email, fictionalHash, fullName, 'user').lastInsertRowid;
});

const CATALOG_SOURCES = new Set(['thecatapi', 'thedogapi', 'dogceo']);

const insertAnimal = db.prepare(
  `INSERT INTO animals
     (owner_id, animal_id, source, species, breed, breed_secondary, name, age,
      gender, color, physical_desc, temperament, status, owner_name, adopted,
      intake_type, location, image_url, date_listed,
      identified, identified_reason, sterilized, sterilized_reason)
   VALUES
     (@owner_id, @animal_id, @source, @species, @breed, @breed_secondary, @name, @age,
      @gender, @color, @physical_desc, @temperament, @status, @owner_name, @adopted,
      @intake_type, @location, @image_url, @date_listed,
      @identified, @identified_reason, @sterilized, @sterilized_reason)`
);

// IDs insérés (avec leur propriétaire) pour tisser ensuite le réseau d'amitiés.
const insertedAnimals = [];

const insertAnimals = db.transaction((rows) => {
  rows.forEach((a, index) => {
    // Prénom : on garde celui de la source (refuge d'Austin) quand il existe ;
    // les lignes de catalogues de races (nom = race) et les matricules de
    // refuge (ex. « A870466 ») reçoivent un vrai prénom.
    let name = (a.name ?? '').replace(/^\*+/, '').trim();
    const looksLikeCode = /^[A-Z]\d+$/i.test(name);
    if (!name || name === 'Sans nom' || looksLikeCode || CATALOG_SOURCES.has(a.source)) {
      name = pick(PET_NAMES);
    }

    // Volet sensibilisation : statuts plausibles, justifiés quand c'est « non ».
    const identified = rand() < 0.7 ? 1 : 0;
    const sterilized = rand() < 0.6 ? 1 : 0;

    // Les deux premiers profils appartiennent au compte client de démo
    // (pour montrer un compte multi-animaux) ; le reste à la communauté fictive.
    // Leur localisation est belge pour que le feed remonte les évènements locaux.
    const ownerId = index < 2 ? clientId : pick(fictionalIds);
    const location = index === 0 ? 'Huy, Belgique' : index === 1 ? 'Liège, Belgique' : (a.location ?? null);

    const info = insertAnimal.run({
      owner_id: ownerId,
      animal_id: a.animal_id ?? null,
      source: a.source ?? 'petsbook',
      species: a.species ?? 'autre',
      breed: a.breed ?? null,
      breed_secondary: a.breed_secondary ?? null,
      name,
      age: a.age ?? `${1 + Math.floor(rand() * 12)} ans`,
      gender: a.gender ?? (rand() < 0.5 ? 'Mâle' : 'Femelle'),
      color: a.color ?? null,
      physical_desc: a.physical_desc ?? null,
      temperament: a.temperament ?? null,
      status: a.status ?? null,
      owner_name: a.owner_name ?? null,
      adopted: a.adopted ?? null,
      intake_type: a.intake_type ?? null,
      location,
      image_url: a.image_url ?? null,
      date_listed: a.date_listed ?? null,
      identified,
      identified_reason: identified ? null : pick(IDENTIFIED_REASONS),
      sterilized,
      sterilized_reason: sterilized ? null : pick(STERILIZED_REASONS),
    });
    insertedAnimals.push({ id: info.lastInsertRowid, ownerId });
  });
});
insertAnimals(animals);

// -----------------------------------------------------------------------------
// Réseau d'amitiés « copain/copine » entre animaux.
//  - ~160 amitiés acceptées dans la communauté fictive (alimente les
//    suggestions par copains en commun) ;
//  - les animaux du client démo reçoivent des copains + 2 demandes en attente
//    (pour démontrer le flux accepter/refuser).
// -----------------------------------------------------------------------------
const insertFriendship = db.prepare(
  `INSERT OR IGNORE INTO friendships (requester_animal_id, addressee_animal_id, status, responded_at)
   VALUES (?, ?, ?, ?)`
);

const seedFriendships = db.transaction(() => {
  const clientAnimals = insertedAnimals.filter((a) => a.ownerId === clientId);
  const others = insertedAnimals.filter((a) => a.ownerId !== clientId);

  // Communauté fictive : paires aléatoires (propriétaires différents),
  // ordonnées min->max pour éviter les doublons dans les deux sens.
  for (let i = 0; i < 220; i += 1) {
    const a = pick(others);
    const b = pick(others);
    if (a.id === b.id || a.ownerId === b.ownerId) continue;
    const [lo, hi] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
    insertFriendship.run(lo, hi, 'accepted', '2026-06-01 12:00:00');
  }

  // Copains des animaux du client démo + demandes reçues en attente.
  clientAnimals.forEach((mine, index) => {
    for (let i = 0; i < 4; i += 1) {
      const friend = pick(others);
      if (friend.ownerId === clientId) continue;
      insertFriendship.run(mine.id, friend.id, 'accepted', '2026-06-05 18:00:00');
    }
    // Demande en attente — uniquement si aucune relation n'existe déjà.
    const requester = others[(index * 13 + 7) % others.length];
    const already = db.prepare(
      `SELECT id FROM friendships
       WHERE (requester_animal_id = @a AND addressee_animal_id = @b)
          OR (requester_animal_id = @b AND addressee_animal_id = @a)`
    ).get({ a: requester.id, b: mine.id });
    if (!already) insertFriendship.run(requester.id, mine.id, 'pending', null);

    // Une demande ENVOYÉE en attente (suivi des demandes côté client).
    const target = others[(index * 19 + 11) % others.length];
    const alreadySent = db.prepare(
      `SELECT id FROM friendships
       WHERE (requester_animal_id = @a AND addressee_animal_id = @b)
          OR (requester_animal_id = @b AND addressee_animal_id = @a)`
    ).get({ a: mine.id, b: target.id });
    if (!alreadySent) insertFriendship.run(mine.id, target.id, 'pending', null);
  });
});
seedFriendships();

const insertEvent = db.prepare(
  `INSERT INTO events (title, description, location, starts_at, image_url) VALUES (@title, @description, @location, @startsAt, @imageUrl)`
);
const EVENTS = [
  {
    title: 'Balade dans la vallée de la Solière',
    description: 'Promenade nature au départ du parking Elysée-Beaufort, en bordure de forêt. Le ruisseau de la Solière vous accompagnera tout au long du parcours. Site protégé : animaux tenus en laisse.',
    location: 'Huy, Belgique',
    startsAt: '2026-06-15 10:00:00',
    imageUrl: '/images/balade-soliere.jpg',
  },
  {
    title: "Salon de l'adoption féline",
    description: "Une journée pour rencontrer des chats et chatons à l'adoption, échanger avec les refuges partenaires et tout savoir sur l'accueil d'un nouveau compagnon.",
    location: 'Namur, Belgique',
    startsAt: '2026-06-21 11:00:00',
    imageUrl: '/images/events/event-adoption-feline.jpg',
  },
  {
    title: 'Journée portes ouvertes du refuge',
    description: "Visite des installations, présentation des animaux à l'adoption et stands de sensibilisation. Petite restauration sur place au profit du refuge.",
    location: 'Charleroi, Belgique',
    startsAt: '2026-06-28 10:00:00',
    imageUrl: '/images/events/event-refuge.jpg',
  },
  {
    title: 'Atelier comportementaliste chien',
    description: 'Atelier pratique pour mieux comprendre la communication canine et désamorcer les comportements gênants au quotidien.',
    location: 'Liège, Belgique',
    startsAt: '2026-07-02 14:00:00',
    imageUrl: '/images/partner-comportementaliste.jpg',
  },
  {
    title: "Cours collectif d'éducation canine",
    description: "Séance en plein air encadrée par un éducateur : marche en laisse, rappel et exercices d'obéissance de base. Ouvert à tous les niveaux.",
    location: 'Liège, Belgique',
    startsAt: '2026-07-12 09:30:00',
    imageUrl: '/images/events/event-education-canine.jpg',
  },
  {
    title: 'Concours canin & démonstrations agility',
    description: "Démonstrations d'agility, parcours d'obstacles et concours amical ouvert aux duos maître-chien. Spectacle garanti pour petits et grands.",
    location: 'Wavre, Belgique',
    startsAt: '2026-07-19 13:00:00',
    imageUrl: '/images/events/event-agility.jpg',
  },
  {
    title: 'Atelier premiers secours pour animaux',
    description: 'Formation pratique aux gestes qui sauvent : reconnaître une urgence, réagir à un étouffement, préparer une trousse de secours. Animé par un vétérinaire.',
    location: 'Bruxelles, Belgique',
    startsAt: '2026-08-08 14:00:00',
    imageUrl: '/images/events/event-premiers-secours.jpg',
  },
  {
    title: 'Marche solidaire pour les animaux abandonnés',
    description: "Marche conviviale en faveur des animaux abandonnés. Les bénéfices des inscriptions sont reversés aux refuges locaux. Venez accompagné de votre chien tenu en laisse.",
    location: 'Huy, Belgique',
    startsAt: '2026-09-06 10:00:00',
    imageUrl: '/images/events/event-marche.jpg',
  },
];
for (const event of EVENTS) insertEvent.run(event);

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

// -----------------------------------------------------------------------------
// Marketplace : annonces de démo, une vente en cours et une conversation
// -----------------------------------------------------------------------------
const insertListing = db.prepare(
  `INSERT INTO listings (seller_id, title, description, category, brand, condition, price_cents)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insertListingImage = db.prepare(
  'INSERT INTO listing_images (listing_id, url, position) VALUES (?, ?, ?)'
);

function seedListing(sellerId, title, description, category, brand, condition, priceCents, images) {
  const id = insertListing.run(sellerId, title, description, category, brand, condition, priceCents).lastInsertRowid;
  images.forEach((url, i) => insertListingImage.run(id, url, i));
  return id;
}

const listingCollier = seedListing(clientId, 'Collier en cuir naturel', 'Collier artisanal réglable en cuir, très peu porté (taille M). Mon chien a grandi trop vite !', 'accessoire', 'Toutous & Co', 'tres-bon', 1250, ['/images/partner-toutous.jpg']);
seedListing(clientId, 'Jouet en corde pour chien', 'Corde solide pour les séances de tir, quelques traces de crocs mais encore beaucoup de vie devant elle.', 'jouet', null, 'bon', 450, ['/images/partner-holidog.jpg']);
const listingCroquettes = seedListing(adminId, 'Sac de croquettes bio 5 kg (non entamé)', 'Sac jamais ouvert, mon chat est passé à une alimentation spécifique sur conseil vétérinaire. DLC longue.', 'alimentation', 'Tipaw', 'neuf', 2490, ['/images/partner-tipaw.jpg']);
const listingPanier = seedListing(adminId, 'Panier douillet pour chat', 'Panier moelleux lavable en machine, mon chat lui préfère obstinément le canapé...', 'habitat', null, 'bon', 1500, ['/images/cesar.jpg']);
seedListing(clientId, 'Kit brosse + peigne de toilettage', 'Kit de toilettage complet pour poils longs, utilisé deux fois.', 'hygiene', 'VetCare', 'tres-bon', 800, ['/images/partner-vetcare.jpg']);

// Vente en cours : le client a acheté les croquettes de l'admin (séquestre « paid »).
db.prepare('INSERT INTO orders (listing_id, buyer_id) VALUES (?, ?)').run(listingCroquettes, clientId);
db.prepare("UPDATE listings SET status = 'reserved' WHERE id = ?").run(listingCroquettes);

// Vente terminée : l'admin a acheté le collier du client (séquestre libéré, reçu).
db.prepare("INSERT INTO orders (listing_id, buyer_id, status) VALUES (?, ?, 'received')").run(listingCollier, adminId);
db.prepare("UPDATE listings SET status = 'sold' WHERE id = ?").run(listingCollier);

// Conversation de démo : le client questionne l'admin sur le panier.
const convId = db.prepare(
  'INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES (?, ?, ?)'
).run(listingPanier, clientId, adminId).lastInsertRowid;
const insertChat = db.prepare(
  'INSERT INTO chat_messages (conversation_id, sender_id, body, read_at) VALUES (?, ?, ?, ?)'
);
insertChat.run(convId, clientId, 'Bonjour ! Le panier est-il toujours disponible ? Conviendrait-il à un grand chat ?', '2026-06-09 10:05:00');
insertChat.run(convId, adminId, 'Bonjour, oui toujours disponible ! Il fait 50 cm de diamètre, parfait pour un grand chat.', null);

// -----------------------------------------------------------------------------
// Pages professionnelles fictives (sponsors, asso, vétérinaire) + publications.
// Plus tard : espace pro payant en self-service ; pour l'instant, du contenu
// crédible pour le feed (étiqueté « Sponsorisé » côté front).
// -----------------------------------------------------------------------------
// Partenaires abonnés : tant que l'abonnement est actif, leurs posts sont
// diffusés en pub et ils peuvent vendre dans le Pet's Shop.
const insertPage = db.prepare(
  `INSERT INTO pages (name, category, description, image_url, website, subscription_status, subscribed_until)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const SUBSCRIBED_UNTIL = '2027-06-14';
const pageVetcare = insertPage.run('Clinique VetCare', 'veterinaire', 'Clinique vétérinaire à Liège — médecine, chirurgie et prévention.', '/images/partner-vetcare.jpg', 'https://example.com/vetcare', 'active', SUBSCRIBED_UNTIL).lastInsertRowid;
const pageTipaw = insertPage.run('Tipaw', 'sponsor', 'Alimentation naturelle pour chiens et chats.', '/images/partner-tipaw.jpg', 'https://example.com/tipaw', 'active', SUBSCRIBED_UNTIL).lastInsertRowid;
const pageHolidog = insertPage.run('Holidog', 'sponsor', 'Garde d\'animaux et promenades partout en Belgique.', '/images/partner-holidog.jpg', 'https://example.com/holidog', 'active', SUBSCRIBED_UNTIL).lastInsertRowid;
const pagePattes = insertPage.run('Les Pattes du Cœur', 'association', 'Association de protection animale — adoptions et sensibilisation.', '/images/partner-extra.jpg', null, 'active', SUBSCRIBED_UNTIL).lastInsertRowid;

// Annonces professionnelles dans le Pet's Shop (vendeur = une Page abonnée).
// Elles cohabitent avec les annonces des particuliers, avec un badge « Pro ».
const insertProListing = db.prepare(
  `INSERT INTO listings (seller_page_id, title, description, category, brand, condition, price_cents)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
function seedProListing(pageId, title, description, category, brand, priceCents, images) {
  const id = insertProListing.run(pageId, title, description, category, brand, 'neuf', priceCents).lastInsertRowid;
  images.forEach((url, i) => insertListingImage.run(id, url, i));
  return id;
}
seedProListing(pageTipaw, 'Croquettes premium sans céréales 12 kg', 'Formule complète riche en protéines, sans céréales, pour chiens adultes de toutes tailles. Livraison rapide.', 'alimentation', 'Tipaw', 4990, ['/images/partner-tipaw.jpg']);
seedProListing(pageVetcare, 'Pipettes antiparasitaires (lot de 6)', 'Protection mensuelle contre puces et tiques, conseillée par nos vétérinaires. Pour chats et chiens.', 'hygiene', 'VetCare', 2790, ['/images/partner-vetcare.jpg']);
seedProListing(pageHolidog, 'Harnais confort réfléchissant', 'Harnais ergonomique réglable, bandes réfléchissantes pour les sorties du soir. Plusieurs tailles.', 'accessoire', 'Holidog', 1990, ['/images/partner-holidog.jpg']);

const insertPost = db.prepare(
  `INSERT INTO posts (animal_id, page_id, body, image_url, created_at) VALUES (?, ?, ?, ?, ?)`
);

// Publications sponsorisées.
insertPost.run(null, pageVetcare, '🛡️ Mois de l\'identification : -20 % sur la pose de puce électronique tout le mois de juin. Pensez-y, c\'est obligatoire et ça sauve des retrouvailles !', null, '2026-06-09 09:00:00');
insertPost.run(null, pageTipaw, 'Nouvelle gamme sans céréales pour chats sensibles 🐱 Échantillons offerts sur demande.', '/images/partner-tipaw.jpg', '2026-06-08 14:00:00');
insertPost.run(null, pageHolidog, 'Vous partez cet été ? Nos pet-sitters vérifiés gardent vos compagnons avec amour. 🏖️', null, '2026-06-07 11:00:00');
insertPost.run(null, pagePattes, '14 adoptions ce mois-ci grâce à vous ! Merci la communauté Pet\'s Book 💚', '/images/partner-extra.jpg', '2026-06-06 17:30:00');

// Publications d'animaux : les copains du client démo (pour peupler son feed),
// ses propres animaux, et quelques membres de la communauté.
const ANIMAL_POSTS = [
  'A trouvé le rayon de soleil parfait pour la sieste ☀️',
  'Balade du matin : 3 écureuils repérés, 0 attrapés. On ne lâche rien 🐿️',
  'Nouveau jouet adopté en 4 minutes chrono. Record battu !',
  'Visite chez le vétérinaire aujourd\'hui... j\'ai été TRÈS courageux 🛡️',
  'Quelqu\'un d\'autre trouve que les cartons sont meilleurs que les paniers ?',
  'Premier bain de l\'été. Je décline toute responsabilité pour l\'état de la salle de bain 🛁',
  'Mes humains ont ENCORE mangé sans partager. Tribunal.',
  'Grande nouvelle : je connais maintenant « assis » ET « patte ». Génie ? Génie.',
  'Rencontre au parc avec une bande de copains adorables 🐾',
  'Opération mission croquettes cachées : succès total.',
  'Aujourd\'hui j\'ai dormi 14 heures. Demain, objectif 15.',
  'Mon humain dit que je ronfle. Calomnie absolue.',
];

const clientAnimalIds = insertedAnimals.filter((a) => a.ownerId === clientId).map((a) => a.id);
const clientPlaceholders = clientAnimalIds.map(() => '?').join(',');
const clientCopainIds = db.prepare(
  `SELECT requester_animal_id AS a, addressee_animal_id AS b FROM friendships
   WHERE status = 'accepted'
     AND (requester_animal_id IN (${clientPlaceholders}) OR addressee_animal_id IN (${clientPlaceholders}))`
).all(...clientAnimalIds, ...clientAnimalIds)
  .map((r) => (clientAnimalIds.includes(r.a) ? r.b : r.a));

const seedPosts = db.transaction(() => {
  let day = 10;
  for (const copainId of clientCopainIds) {
    insertPost.run(copainId, null, pick(ANIMAL_POSTS), null, `2026-06-${String(day).padStart(2, '0')} ${10 + (day % 8)}:15:00`);
    day -= 1;
    if (day < 1) day = 10;
  }
  // Mes animaux publient aussi.
  clientAnimalIds.forEach((id, i) => {
    insertPost.run(id, null, pick(ANIMAL_POSTS), null, `2026-06-0${9 - i} 19:30:00`);
  });
  // Et un peu de vie dans le reste de la communauté.
  for (let i = 0; i < 12; i += 1) {
    const someone = pick(insertedAnimals);
    insertPost.run(someone.id, null, pick(ANIMAL_POSTS), null, `2026-06-0${1 + (i % 9)} ${8 + (i % 12)}:00:00`);
  }
});
seedPosts();

// Réactions emoji de démo : quelques membres réagissent aux publications.
const REACTION_EMOJIS = ['❤️', '😂', '😮', '🥰', '👏', '🐾'];
const allUserIds = [clientId, adminId, ...fictionalIds];
const insertReaction = db.prepare(
  'INSERT OR IGNORE INTO reactions (post_id, user_id, emoji) VALUES (?, ?, ?)'
);
const seedReactions = db.transaction(() => {
  const postIds = db.prepare('SELECT id FROM posts').all().map((r) => r.id);
  for (const postId of postIds) {
    const count = Math.floor(rand() * 7); // 0 à 6 réactions par post
    for (let i = 0; i < count; i += 1) {
      insertReaction.run(postId, pick(allUserIds), pick(REACTION_EMOJIS));
    }
  }
});
seedReactions();

// Quelques messages de démonstration pour l'espace admin.
const insertMessage = db.prepare(
  `INSERT INTO messages (type, name, email, subject, body, is_handled) VALUES (?, ?, ?, ?, ?, ?)`
);
insertMessage.run('contact', 'Sophie Laurent', 'sophie.laurent@example.com', 'Question sur les adoptions', 'Bonjour, comment se passe une adoption via votre plateforme ? Merci d\'avance.', 0);
insertMessage.run('suggestion', 'Marc Dubois', 'marc.dubois@example.com', 'Idée de fonctionnalité', 'Ce serait super de pouvoir filtrer les profils par localisation. Bonne continuation !', 0);
insertMessage.run('plainte', 'Inès Renard', 'ines.renard@example.com', null, 'Une annonce me semble frauduleuse, pouvez-vous vérifier le profil signalé hier ?', 0);

console.log('Seed terminé.');
console.log(`  - ${animals.length} profils d'animaux (The Cat/Dog API + Austin) + réseau de copains`);
console.log(`  - ${pet911Reports.length} annonces perdu/trouvé importées de Pet911`);
console.log('  - 5 annonces marketplace + 1 vente en cours + 1 conversation de démo');
console.log(`  - Admin  : ${ACCOUNTS.admin.email}  /  ${ACCOUNTS.admin.password}`);
console.log(`  - Client : ${ACCOUNTS.client.email} /  ${ACCOUNTS.client.password}`);
console.log('  → Identifiants archivés dans CREDENTIALS.local.md (gitignored).');
