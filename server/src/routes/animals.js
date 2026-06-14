import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin, attachUser } from '../middlewares/auth.js';
import { uploadProfilePhoto } from '../lib/upload.js';

const router = Router();

const SELECT_FIELDS = `
  a.id, a.animal_id AS animalId, a.source, a.species, a.breed,
  a.breed_secondary AS breedSecondary, a.name, a.age, a.gender, a.color,
  a.physical_desc AS physicalDesc, a.temperament, a.status,
  COALESCE(a.owner_name, u.display_name) AS ownerName,
  a.adopted, a.intake_type AS intakeType, a.location,
  a.image_url AS imageUrl, a.date_listed AS dateListed,
  a.identified, a.identified_reason AS identifiedReason,
  a.sterilized, a.sterilized_reason AS sterilizedReason,
  a.visibility, a.friend_policy AS friendPolicy,
  a.owner_id AS ownerId
`;

// Annuaire complet des profils, répertorié par prénom — RÉSERVÉ À L'ADMIN.
// Les membres découvrent les profils via les copains et les suggestions.
router.get('/', requireAdmin, (req, res) => {
  const animals = db.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM animals a
     LEFT JOIN users u ON u.id = a.owner_id
     ORDER BY a.name COLLATE NOCASE ASC`
  ).all();
  res.json(animals);
});

// Vitrine publique de l'accueil : 3 profils en avant, informations minimales.
router.get('/featured', (req, res) => {
  // Limite optionnelle (1–12) : 3 pour la vitrine d'accueil, davantage pour la
  // galerie de la page À propos.
  const limit = Math.min(Math.max(Number(req.query.limit) || 3, 1), 12);
  const animals = db.prepare(
    `SELECT a.id, a.name, a.species, a.breed, a.temperament, a.image_url AS imageUrl
     FROM animals a
     WHERE a.image_url IS NOT NULL
     ORDER BY RANDOM() LIMIT ?`
  ).all(limit);
  res.json(animals);
});

// Les profils du membre connecté (un compte peut porter plusieurs animaux).
router.get('/mine', requireAuth, (req, res) => {
  const animals = db.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM animals a
     LEFT JOIN users u ON u.id = a.owner_id
     WHERE a.owner_id = ?
     ORDER BY a.name COLLATE NOCASE ASC`
  ).all(req.user.id);
  res.json(animals);
});

// Un profil n'est visible que par : l'admin, son propriétaire, tout membre
// connecté si le profil est « public », ou un membre dont l'un des animaux est
// copain avec lui. Sinon : aperçu minimal (403).
function canViewAnimal(user, animalId, ownerId, visibility) {
  if (!user) return false;
  if (user.role === 'admin' || ownerId === user.id) return true;
  if (visibility === 'public') return true;
  const link = db.prepare(
    `SELECT f.id
     FROM friendships f
     JOIN animals mine ON mine.id IN (f.requester_animal_id, f.addressee_animal_id)
     WHERE f.status = 'accepted'
       AND mine.owner_id = ?
       AND (f.requester_animal_id = ? OR f.addressee_animal_id = ?)`
  ).get(user.id, animalId, animalId);
  return Boolean(link);
}

router.get('/:id', attachUser, (req, res) => {
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

  if (!req.user) {
    return res.status(401).json({ message: 'Connectez-vous pour découvrir ce profil' });
  }
  if (!canViewAnimal(req.user, animal.id, animal.ownerId, animal.visibility)) {
    return res.status(403).json({
      message: 'Ce profil est privé : devenez copains pour le découvrir !',
      preview: {
        id: animal.id,
        name: animal.name,
        species: animal.species,
        gender: animal.gender,
        imageUrl: animal.imageUrl,
      },
    });
  }
  res.json(animal);
});

// Création d'un profil animal par un membre — multipart (photo de profil + champs).
// Volet sensibilisation : si non identifié / non stérilisé, la raison est requise.
router.post('/', requireAuth, (req, res, next) => {
  uploadProfilePhoto(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'Téléversement refusé' });
    }
    try {
      const {
        name, species, breed, age, gender, temperament,
        identified, identifiedReason, sterilized, sterilizedReason,
      } = req.body ?? {};

      if (typeof name !== 'string' || name.trim().length < 1) {
        return res.status(400).json({ message: 'Le prénom de l\'animal est requis' });
      }
      if (typeof species !== 'string' || species.trim().length < 1) {
        return res.status(400).json({ message: 'L\'espèce est requise' });
      }
      if (identified !== '0' && identified !== '1') {
        return res.status(400).json({ message: 'Précisez si l\'animal est identifié (puce ou tatouage)' });
      }
      if (identified === '0' && (typeof identifiedReason !== 'string' || identifiedReason.trim().length < 3)) {
        return res.status(400).json({ message: 'Expliquez pourquoi l\'animal n\'est pas encore identifié' });
      }
      if (sterilized !== '0' && sterilized !== '1') {
        return res.status(400).json({ message: 'Précisez si l\'animal est stérilisé' });
      }
      if (sterilized === '0' && (typeof sterilizedReason !== 'string' || sterilizedReason.trim().length < 3)) {
        return res.status(400).json({ message: 'Indiquez la raison pour laquelle l\'animal n\'est pas stérilisé' });
      }

      const result = db.prepare(
        `INSERT INTO animals
           (owner_id, source, name, species, breed, age, gender, temperament,
            identified, identified_reason, sterilized, sterilized_reason, image_url)
         VALUES (?, 'petsbook', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        req.user.id, name.trim(), species.trim(), breed?.trim() || null,
        age?.trim() || null, gender?.trim() || null, temperament?.trim() || null,
        Number(identified), identified === '0' ? identifiedReason.trim() : null,
        Number(sterilized), sterilized === '0' ? sterilizedReason.trim() : null,
        req.file ? `/uploads/${req.file.filename}` : null,
      );
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err) {
      next(err);
    }
  });
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

    const {
      name, species, breed, age, gender, color, physicalDesc, temperament, location, imageUrl,
      identified, identifiedReason, sterilized, sterilizedReason,
    } = req.body ?? {};
    db.prepare(
      `UPDATE animals
       SET name = COALESCE(?, name),
           species = COALESCE(?, species),
           breed = ?,
           age = ?,
           gender = ?,
           color = ?,
           physical_desc = ?,
           temperament = ?,
           location = ?,
           image_url = ?,
           identified = ?,
           identified_reason = ?,
           sterilized = ?,
           sterilized_reason = ?
       WHERE id = ?`
    ).run(
      typeof name === 'string' ? name.trim() : null,
      typeof species === 'string' ? species.trim() : null,
      breed ?? null, age ?? null, gender ?? null, color ?? null,
      physicalDesc ?? null, temperament ?? null, location ?? null, imageUrl ?? null,
      identified ?? null, identifiedReason ?? null,
      sterilized ?? null, sterilizedReason ?? null,
      id,
    );

    res.json({ id });
  } catch (err) {
    next(err);
  }
});

// Paramètres du profil (visibilité, qui peut demander en copain) — propriétaire only.
router.put('/:id/settings', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const existing = db.prepare('SELECT owner_id FROM animals WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Animal introuvable' });
    if (existing.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Seul le propriétaire peut modifier les paramètres' });
    }

    const { visibility, friendPolicy } = req.body ?? {};
    if (!['private', 'public'].includes(visibility)) {
      return res.status(400).json({ message: 'Visibilité invalide' });
    }
    if (!['everyone', 'friends-of-friends', 'nobody'].includes(friendPolicy)) {
      return res.status(400).json({ message: 'Préférence de copinage invalide' });
    }

    db.prepare('UPDATE animals SET visibility = ?, friend_policy = ? WHERE id = ?')
      .run(visibility, friendPolicy, id);
    res.json({ id, visibility, friendPolicy });
  } catch (err) {
    next(err);
  }
});

// Suppression : le propriétaire peut retirer son propre profil ; l'admin modère.
router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  const existing = db.prepare('SELECT owner_id FROM animals WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: 'Animal introuvable' });
  if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Suppression non autorisée' });
  }
  db.prepare('DELETE FROM animals WHERE id = ?').run(id);
  res.status(204).end();
});

export default router;
