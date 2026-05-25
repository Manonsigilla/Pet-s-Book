// Annonces perdus/retrouvés avec workflow d'approbation par un admin.
import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin, attachUser } from '../middlewares/auth.js';

const router = Router();

const SPECIES_ALLOWED = ['chat', 'chien', 'lapin', 'oiseau', 'autre'];
const STATUS_ALLOWED = ['lost', 'found', 'closed'];

const SELECT_FIELDS = `
  l.id, l.animal_name AS animalName, l.species, l.description, l.location,
  l.lost_date AS lostDate, l.status, l.is_approved AS isApproved,
  l.contact, l.image_url AS imageUrl, l.created_at AS createdAt,
  u.display_name AS reporterName
`;

// -----------------------------------------------------------------------------
// Listing public — uniquement les annonces approuvées par un admin
// -----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM lost_reports l
     LEFT JOIN users u ON u.id = l.reporter_id
     WHERE l.is_approved = 1
     ORDER BY l.lost_date DESC, l.id DESC`
  ).all();
  res.json(rows);
});

// -----------------------------------------------------------------------------
// File d'attente admin — uniquement les annonces NON encore approuvées
// -----------------------------------------------------------------------------
router.get('/pending', requireAdmin, (req, res) => {
  const rows = db.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM lost_reports l
     LEFT JOIN users u ON u.id = l.reporter_id
     WHERE l.is_approved = 0
     ORDER BY l.created_at ASC`
  ).all();
  res.json(rows);
});

// -----------------------------------------------------------------------------
// Détail public — restreint aux approuvées sauf si admin
// -----------------------------------------------------------------------------
router.get('/:id', attachUser, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }

  const row = db.prepare(
    `SELECT ${SELECT_FIELDS}
     FROM lost_reports l
     LEFT JOIN users u ON u.id = l.reporter_id
     WHERE l.id = ?`
  ).get(id);

  if (!row) return res.status(404).json({ message: 'Annonce introuvable' });

  const isAdmin = req.user?.role === 'admin';
  if (!row.isApproved && !isAdmin) {
    return res.status(404).json({ message: 'Annonce introuvable' });
  }
  res.json(row);
});

// -----------------------------------------------------------------------------
// Création par un utilisateur connecté — créée en attente d'approbation
// -----------------------------------------------------------------------------
router.post('/', requireAuth, (req, res, next) => {
  try {
    const { animalName, species, description, location, lostDate, status, contact, imageUrl } = req.body ?? {};

    if (typeof animalName !== 'string' || animalName.trim().length < 1) {
      return res.status(400).json({ message: 'Le nom de l\'animal est requis' });
    }
    if (!SPECIES_ALLOWED.includes(species)) {
      return res.status(400).json({ message: 'Espèce invalide' });
    }
    if (typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ message: 'La description doit faire au moins 10 caractères' });
    }
    if (typeof location !== 'string' || location.trim().length < 2) {
      return res.status(400).json({ message: 'Le lieu est requis' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lostDate)) {
      return res.status(400).json({ message: 'Date invalide (format attendu : YYYY-MM-DD)' });
    }
    const reportStatus = STATUS_ALLOWED.includes(status) ? status : 'lost';
    if (typeof contact !== 'string' || contact.trim().length < 3) {
      return res.status(400).json({ message: 'Un contact est requis' });
    }

    const result = db.prepare(
      `INSERT INTO lost_reports
        (reporter_id, animal_name, species, description, location, lost_date, status, contact, image_url, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(
      req.user.id,
      animalName.trim(),
      species,
      description.trim(),
      location.trim(),
      lostDate,
      reportStatus,
      contact.trim(),
      imageUrl ?? null,
    );

    res.status(201).json({ id: result.lastInsertRowid, isApproved: false });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Approbation admin
// -----------------------------------------------------------------------------
router.post('/:id/approve', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  const info = db.prepare(
    `UPDATE lost_reports
     SET is_approved = 1, approved_by = ?, approved_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(req.user.id, id);
  if (info.changes === 0) return res.status(404).json({ message: 'Annonce introuvable' });
  res.json({ id, isApproved: true });
});

router.post('/:id/reject', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  const info = db.prepare('DELETE FROM lost_reports WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ message: 'Annonce introuvable' });
  res.status(204).end();
});

export default router;
