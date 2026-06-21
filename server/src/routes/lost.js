// Annonces perdus/retrouvés avec workflow d'approbation par un admin.
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireAdmin, attachUser } from '../middlewares/auth.js';
import { uploadReportPhoto } from '../lib/upload.js';

const router = Router();

const SPECIES_ALLOWED = ['chat', 'chien', 'lapin', 'oiseau', 'autre'];
const STATUS_ALLOWED = ['lost', 'found', 'closed'];

const SELECT_FIELDS = `
  l.id, l.animal_name AS animalName, l.species, l.description, l.location,
  l.lost_date AS lostDate, l.status, l.is_approved AS isApproved,
  l.contact, l.image_url AS imageUrl, l.tips_count AS tipsCount,
  l.reporter_id AS reporterId, l.created_at AS createdAt,
  u.display_name AS reporterName
`;

// -----------------------------------------------------------------------------
// Listing public — uniquement les annonces approuvées par un admin
// -----------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT ${SELECT_FIELDS}
       FROM lost_reports l
       LEFT JOIN users u ON u.id = l.reporter_id
       WHERE l.is_approved = 1
       ORDER BY l.lost_date DESC, l.id DESC`
    ).all();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// File d'attente admin — uniquement les annonces NON encore approuvées
// -----------------------------------------------------------------------------
router.get('/pending', requireAdmin, async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT ${SELECT_FIELDS}
       FROM lost_reports l
       LEFT JOIN users u ON u.id = l.reporter_id
       WHERE l.is_approved = 0
       ORDER BY l.created_at ASC`
    ).all();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Détail public — restreint aux approuvées sauf si admin
// -----------------------------------------------------------------------------
router.get('/:id', attachUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const row = await db.prepare(
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
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Création par un utilisateur connecté — créée en attente d'approbation
// -----------------------------------------------------------------------------
router.post('/', requireAuth, uploadReportPhoto, async (req, res, next) => {
  try {
    const { animalName, species, description, location, lostDate, status, contact } = req.body ?? {};
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

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

    const result = await db.prepare(
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
      imageUrl,
    );

    res.status(201).json({ id: result.lastInsertRowid, isApproved: false });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Approbation admin
// -----------------------------------------------------------------------------
router.post('/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const info = await db.prepare(
      `UPDATE lost_reports
       SET is_approved = 1, approved_by = ?, approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(req.user.id, id);
    if (info.changes === 0) return res.status(404).json({ message: 'Annonce introuvable' });
    res.json({ id, isApproved: true });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Bouton « J'ai des informations » — incrémente le compteur et stocke le message
// -----------------------------------------------------------------------------
router.post('/:id/tip', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const { message } = req.body ?? {};

    // Incrémente le compteur
    await db.prepare('UPDATE lost_reports SET tips_count = tips_count + 1 WHERE id = ?').run(id);

    // Si un message est fourni, le stocke dans lost_tips
    if (message && typeof message === 'string' && message.trim().length > 0) {
      await db.prepare(
        'INSERT INTO lost_tips (lost_report_id, user_id, message) VALUES (?, ?, ?)'
      ).run(id, req.user.id, message.trim());
    }

    const row = await db.prepare('SELECT tips_count AS tipsCount FROM lost_reports WHERE id = ?').get(id);
    res.json({ tipsCount: row?.tipsCount ?? 0 });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const info = await db.prepare('DELETE FROM lost_reports WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ message: 'Annonce introuvable' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
