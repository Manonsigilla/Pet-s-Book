import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

const SELECT_FIELDS = `
  a.id, a.name, a.species, a.breed, a.birth_year AS birthYear,
  a.description, a.image_url AS imageUrl,
  a.owner_id AS ownerId, u.display_name AS ownerName
`;

router.get('/', (req, res) => {
  const animals = db.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM animals a
     LEFT JOIN users u ON u.id = a.owner_id
     ORDER BY a.created_at DESC`
  ).all();
  res.json(animals);
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  const animal = db.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM animals a
     LEFT JOIN users u ON u.id = a.owner_id
     WHERE a.id = ?`
  ).get(id);
  if (!animal) return res.status(404).json({ message: 'Animal introuvable' });
  res.json(animal);
});

router.post('/', requireAuth, (req, res, next) => {
  try {
    const { name, species, breed, birthYear, description, imageUrl } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ message: 'Le nom est requis' });
    }
    if (typeof species !== 'string' || species.trim().length < 1) {
      return res.status(400).json({ message: 'L\'espèce est requise' });
    }

    const result = db.prepare(
      `INSERT INTO animals (owner_id, name, species, breed, birth_year, description, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.user.id, name.trim(), species.trim(), breed ?? null,
      birthYear ?? null, description ?? null, imageUrl ?? null,
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

// L'utilisateur peut modifier son propre animal ; l'admin peut modifier n'importe lequel.
router.put('/:id', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const existing = db.prepare('SELECT owner_id FROM animals WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Animal introuvable' });

    const isOwner = existing.owner_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Modification non autorisée' });
    }

    const { name, species, breed, birthYear, description, imageUrl } = req.body ?? {};
    db.prepare(
      `UPDATE animals
       SET name = COALESCE(?, name),
           species = COALESCE(?, species),
           breed = ?,
           birth_year = ?,
           description = ?,
           image_url = ?
       WHERE id = ?`
    ).run(
      typeof name === 'string' ? name.trim() : null,
      typeof species === 'string' ? species.trim() : null,
      breed ?? null, birthYear ?? null, description ?? null, imageUrl ?? null,
      id,
    );

    res.json({ id });
  } catch (err) {
    next(err);
  }
});

// Suppression réservée à l'admin (pouvoir de modération sur les profils).
router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  const info = db.prepare('DELETE FROM animals WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ message: 'Animal introuvable' });
  res.status(204).end();
});

export default router;
