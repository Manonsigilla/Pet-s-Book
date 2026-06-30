-- Schéma initial Pet's Book

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Profils d'animaux — l'objet central du réseau social : chaque membre (humain)
-- inscrit ses animaux ; un compte peut porter plusieurs profils (owner_id 1-N).
-- Les données importées (The Cat/Dog API, Austin) servent de communauté fictive.
-- Volet sensibilisation : identification, stérilisation et vaccination, avec
-- justification lorsque la réponse est non (protéger juridiquement et
-- médicalement l'animal).
CREATE TABLE IF NOT EXISTS animals (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  animal_id         TEXT,                                 -- identifiant d'origine dans la source
  source            TEXT NOT NULL DEFAULT 'petsbook',     -- thecatapi|thedogapi|dogceo|austin|pet911|petsbook
  species           TEXT NOT NULL,
  breed             TEXT,
  breed_secondary   TEXT,
  name              TEXT NOT NULL,
  age               TEXT,
  gender            TEXT,
  color             TEXT,
  physical_desc     TEXT,
  temperament       TEXT,
  status            TEXT,
  owner_name        TEXT,
  adopted           INTEGER,                              -- 0 | 1 | NULL
  intake_type       TEXT,
  location          TEXT,
  image_url         TEXT,
  date_listed       TEXT,
  identified        INTEGER,                              -- 1 = pucé/tatoué, 0 = non, NULL = inconnu
  identified_reason TEXT,                                 -- justification si non identifié
  sterilized        INTEGER,                              -- 1 = stérilisé, 0 = non, NULL = inconnu
  sterilized_reason TEXT,                                 -- justification si non stérilisé
  vaccinated        INTEGER,                              -- 1 = vacciné, 0 = non, NULL = inconnu
  vaccinated_reason TEXT,                                 -- justification si non vacciné
  -- Paramètres du profil (choisis par le propriétaire)
  visibility        TEXT NOT NULL DEFAULT 'private'
                    CHECK (visibility IN ('private', 'public')),   -- private = copains uniquement
  friend_policy     TEXT NOT NULL DEFAULT 'everyone'
                    CHECK (friend_policy IN ('everyone', 'friends-of-friends', 'nobody')),
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lost_reports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  animal_name  TEXT NOT NULL,
  species      TEXT NOT NULL,
  description  TEXT NOT NULL,
  location     TEXT NOT NULL,
  lost_date    DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'lost' CHECK (status IN ('lost', 'found', 'closed')),
  is_approved  INTEGER NOT NULL DEFAULT 0,
  approved_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at  DATETIME,
  contact      TEXT NOT NULL,
  image_url    TEXT,
  tips_count   INTEGER NOT NULL DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages « J'ai des informations » liés aux annonces perdues/trouvées.
CREATE TABLE IF NOT EXISTS lost_tips (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lost_report_id  INTEGER NOT NULL REFERENCES lost_reports(id) ON DELETE CASCADE,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message         TEXT NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_losttips_report ON lost_tips(lost_report_id);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  location    TEXT NOT NULL,
  starts_at   DATETIME NOT NULL,
  image_url   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inscriptions des membres aux évènements : une seule inscription par membre et
-- par évènement (contrainte UNIQUE). Sert à « Mes évènements » et au compteur
-- d'inscrits affiché sur l'agenda.
CREATE TABLE IF NOT EXISTS event_registrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_evreg_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_evreg_user  ON event_registrations(user_id);

-- Avis sur les évènements passés : note 1–5 (obligatoire) + commentaire facultatif.
-- Un seul avis par membre et par évènement (modifiable). Permet de juger un
-- évènement récurrent avant d'y participer (utile s'il devient payant).
CREATE TABLE IF NOT EXISTS event_reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_evreview_event ON event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_evreview_user  ON event_reviews(user_id);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock       INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pages professionnelles / partenaires (sponsors, associations, vétérinaires...).
-- Modèle économique : le partenaire est CLIENT de Pet's Book. Il paie un
-- abonnement (subscription_status = 'active'). Tant qu'il est abonné, ses
-- publications sont diffusées automatiquement en publicité aux membres (pas de
-- boost à l'unité) et il peut vendre dans le Pet's Shop. Les membres, eux, ne
-- paient jamais pour voir ces contenus.
CREATE TABLE IF NOT EXISTS pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'sponsor'
              CHECK (category IN ('sponsor', 'association', 'veterinaire', 'refuge')),
  description TEXT,
  image_url   TEXT,
  website     TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'active'
                      CHECK (subscription_status IN ('active', 'inactive')),
  subscribed_until    DATE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Publications du feed : écrites par un ANIMAL (au nom duquel publie son
-- propriétaire) OU par une PAGE professionnelle — jamais les deux.
CREATE TABLE IF NOT EXISTS posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  animal_id   INTEGER REFERENCES animals(id) ON DELETE CASCADE,
  page_id     INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  image_url   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK ((animal_id IS NULL) != (page_id IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_posts_animal  ON posts(animal_id);
CREATE INDEX IF NOT EXISTS idx_posts_page    ON posts(page_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);

-- Réactions emoji aux publications : une réaction (modifiable) par membre et par
-- post. Changer d'emoji remplace l'ancienne ; recliquer le même la retire.
CREATE TABLE IF NOT EXISTS reactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);

-- Amitiés « copain/copine » ENTRE ANIMAUX (le propriétaire agit au nom de son
-- animal). Un profil n'est visible par un membre que si l'un de ses animaux
-- est copain avec lui ; l'administrateur voit tout.
CREATE TABLE IF NOT EXISTS friendships (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  addressee_animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused')),
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at        DATETIME,
  UNIQUE (requester_animal_id, addressee_animal_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requester ON friendships(requester_animal_id);
CREATE INDEX IF NOT EXISTS idx_friend_addressee ON friendships(addressee_animal_id);
CREATE INDEX IF NOT EXISTS idx_friend_status    ON friendships(status);

-- =============================================================================
-- Marketplace Pet's Shop : annonces entre utilisateurs, commandes (séquestre
-- simulé type Vinted) et messagerie acheteur/vendeur.
-- =============================================================================

-- Annonces du Pet's Shop. Vendeur soit un particulier (seller_id), soit un
-- professionnel abonné (seller_page_id) : un seul shop pour les deux. Les
-- ventes pro se font en achat direct (sans séquestre, cf. orders).
CREATE TABLE IF NOT EXISTS listings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  seller_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'autre'
              CHECK (category IN ('accessoire', 'jouet', 'alimentation', 'habitat', 'hygiene', 'autre')),
  brand       TEXT,
  condition   TEXT NOT NULL DEFAULT 'bon'
              CHECK (condition IN ('neuf', 'tres-bon', 'bon', 'correct')),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'sold')),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- Exactement un vendeur : particulier OU professionnel.
  CHECK ((seller_id IS NULL) != (seller_page_id IS NULL))
);

CREATE TABLE IF NOT EXISTS listing_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0
);

-- Commandes : séquestre simulé. Le « paiement » est retenu (paid) jusqu'à la
-- confirmation de réception par l'acheteur (received), comme sur Vinted.
CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'paid'
              -- 'completed' = achat direct chez un pro (sans étape de séquestre)
              CHECK (status IN ('paid', 'shipped', 'received', 'cancelled', 'completed')),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversations entre un acheteur potentiel et le vendeur d'une annonce.
CREATE TABLE IF NOT EXISTS conversations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id  INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (listing_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at         DATETIME
);

-- Messages publics : formulaires Contact et Suggestions/Plaintes.
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL DEFAULT 'contact' CHECK (type IN ('contact', 'suggestion', 'plainte')),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT,
  body        TEXT NOT NULL,
  is_handled  INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_animals_owner    ON animals(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_type    ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_handled ON messages(is_handled);
CREATE INDEX IF NOT EXISTS idx_listings_seller  ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_page    ON listings(seller_page_id);
CREATE INDEX IF NOT EXISTS idx_listings_status  ON listings(status);
CREATE INDEX IF NOT EXISTS idx_limg_listing     ON listing_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing   ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer     ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chatmsg_conv     ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_animals_source   ON animals(source);
CREATE INDEX IF NOT EXISTS idx_animals_species  ON animals(species);
CREATE INDEX IF NOT EXISTS idx_lost_status      ON lost_reports(status);
CREATE INDEX IF NOT EXISTS idx_lost_approved    ON lost_reports(is_approved);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);

-- Index complémentaires pour les requêtes filtrées par membre (boîte de
-- réception, non-lus, « ma » réaction) — utiles dès qu'il y a du volume.
CREATE INDEX IF NOT EXISTS idx_reactions_user   ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_buyer       ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conv_seller      ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_chatmsg_sender   ON chat_messages(sender_id);
