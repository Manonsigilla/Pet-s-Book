// Publications — un animal publie (via son propriétaire), une Page pro aussi.
// Le feed mélange : posts des copains (et de ses propres animaux), évènements
// proches de la localisation des animaux du membre, et posts sponsorisés des Pages.
import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth } from '../middlewares/auth.js';
import { uploadProfilePhoto } from '../lib/upload.js';

const router = Router();

const POST_FIELDS = `
  p.id, p.body, p.image_url AS imageUrl, p.created_at AS createdAt,
  p.animal_id AS animalId, a.name AS animalName, a.species AS animalSpecies,
  a.image_url AS animalImage, u.display_name AS ownerName,
  p.page_id AS pageId, pg.name AS pageName, pg.category AS pageCategory,
  pg.image_url AS pageImage
`;

const POST_JOINS = `
  FROM posts p
  LEFT JOIN animals a ON a.id = p.animal_id
  LEFT JOIN users u ON u.id = a.owner_id
  LEFT JOIN pages pg ON pg.id = p.page_id
`;

function myAnimalIds(userId) {
  return db.prepare('SELECT id FROM animals WHERE owner_id = ?').all(userId).map((r) => r.id);
}

function copainIds(mine) {
  if (mine.length === 0) return [];
  const placeholders = mine.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT requester_animal_id AS a, addressee_animal_id AS b FROM friendships
     WHERE status = 'accepted'
       AND (requester_animal_id IN (${placeholders}) OR addressee_animal_id IN (${placeholders}))`
  ).all(...mine, ...mine);
  const mineSet = new Set(mine);
  return [...new Set(rows.map((r) => (mineSet.has(r.a) ? r.b : r.a)).filter((id) => !mineSet.has(id)))];
}

// Mots trop génériques pour situer (tout le site est belge) : ignorés.
const LOCATION_STOPWORDS = new Set(['belgique', 'belgium', 'the']);

function locationTokens(location) {
  if (!location) return [];
  return location.toLowerCase().split(/[^a-zà-ÿ]+/)
    .filter((w) => w.length >= 3 && !LOCATION_STOPWORDS.has(w));
}

// -----------------------------------------------------------------------------
// Publier au nom d'un de ses animaux (texte + photo facultative)
// -----------------------------------------------------------------------------
router.post('/', requireAuth, (req, res, next) => {
  uploadProfilePhoto(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'Téléversement refusé' });
    }
    try {
      const animalId = Number(req.body?.animalId);
      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      if (!Number.isInteger(animalId) || animalId < 1) {
        return res.status(400).json({ message: 'Choisissez l\'animal qui publie' });
      }
      if (body.length < 1 || body.length > 2000) {
        return res.status(400).json({ message: 'La publication doit faire entre 1 et 2000 caractères' });
      }
      const animal = db.prepare('SELECT owner_id FROM animals WHERE id = ?').get(animalId);
      if (!animal) return res.status(404).json({ message: 'Animal introuvable' });
      if (animal.owner_id !== req.user.id) {
        return res.status(403).json({ message: 'Vous ne pouvez publier qu\'au nom de vos propres animaux' });
      }

      const result = db.prepare(
        'INSERT INTO posts (animal_id, body, image_url) VALUES (?, ?, ?)'
      ).run(animalId, body, req.file ? `/uploads/${req.file.filename}` : null);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err) {
      next(err);
    }
  });
});

// -----------------------------------------------------------------------------
// Le feed du membre connecté
// -----------------------------------------------------------------------------
router.get('/feed', requireAuth, (req, res) => {
  const mine = myAnimalIds(req.user.id);
  const visibleAuthors = [...mine, ...copainIds(mine)];

  // Posts des copains et de mes animaux.
  let posts = [];
  if (visibleAuthors.length > 0) {
    const placeholders = visibleAuthors.map(() => '?').join(',');
    posts = db.prepare(
      `SELECT ${POST_FIELDS} ${POST_JOINS}
       WHERE p.animal_id IN (${placeholders})
       ORDER BY p.created_at DESC LIMIT 30`
    ).all(...visibleAuthors);
  }

  // Posts sponsorisés des Pages professionnelles.
  const sponsored = db.prepare(
    `SELECT ${POST_FIELDS} ${POST_JOINS}
     WHERE p.page_id IS NOT NULL
     ORDER BY p.created_at DESC LIMIT 6`
  ).all();

  // Évènements à venir proches de la localisation de mes animaux.
  const myTokens = new Set(
    db.prepare(`SELECT location FROM animals WHERE owner_id = ?`)
      .all(req.user.id)
      .flatMap((r) => locationTokens(r.location)),
  );
  const events = db.prepare(
    `SELECT id, title, description, location, starts_at AS startsAt, image_url AS imageUrl
     FROM events WHERE starts_at >= datetime('now') ORDER BY starts_at ASC LIMIT 10`
  ).all().filter((e) => locationTokens(e.location).some((t) => myTokens.has(t))).slice(0, 3);

  // Assemblage : posts (membres + sponsorisés) triés par date, évènements à part.
  const items = [
    ...posts.map((p) => ({ type: 'post', ...p })),
    ...sponsored.map((p) => ({ type: 'sponsored', ...p })),
  ].sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));

  res.json({ events, items });
});

// -----------------------------------------------------------------------------
// Les publications d'un animal (mêmes règles de visibilité que son profil)
// -----------------------------------------------------------------------------
router.get('/animal/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  const animal = db.prepare('SELECT id, owner_id, visibility FROM animals WHERE id = ?').get(id);
  if (!animal) return res.status(404).json({ message: 'Animal introuvable' });

  const isOwner = animal.owner_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isFriend = Boolean(db.prepare(
    `SELECT f.id FROM friendships f
     JOIN animals mine ON mine.id IN (f.requester_animal_id, f.addressee_animal_id)
     WHERE f.status = 'accepted' AND mine.owner_id = ?
       AND (f.requester_animal_id = ? OR f.addressee_animal_id = ?)`
  ).get(req.user.id, id, id));
  if (!isOwner && !isAdmin && animal.visibility !== 'public' && !isFriend) {
    return res.status(403).json({ message: 'Ce profil est privé' });
  }

  const posts = db.prepare(
    `SELECT ${POST_FIELDS} ${POST_JOINS} WHERE p.animal_id = ? ORDER BY p.created_at DESC LIMIT 50`
  ).all(id);
  res.json(posts);
});

// Suppression : propriétaire de l'animal auteur, ou admin.
router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  const post = db.prepare(
    `SELECT p.id, a.owner_id AS ownerId FROM posts p
     LEFT JOIN animals a ON a.id = p.animal_id WHERE p.id = ?`
  ).get(id);
  if (!post) return res.status(404).json({ message: 'Publication introuvable' });
  if (post.ownerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Suppression non autorisée' });
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.status(204).end();
});

export default router;
