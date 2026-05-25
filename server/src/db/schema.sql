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

CREATE TABLE IF NOT EXISTS animals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  species     TEXT NOT NULL,
  breed       TEXT,
  birth_year  INTEGER,
  description TEXT,
  image_url   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
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
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  location    TEXT NOT NULL,
  starts_at   DATETIME NOT NULL,
  image_url   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock       INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_animals_owner    ON animals(owner_id);
CREATE INDEX IF NOT EXISTS idx_lost_status      ON lost_reports(status);
CREATE INDEX IF NOT EXISTS idx_lost_approved    ON lost_reports(is_approved);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
