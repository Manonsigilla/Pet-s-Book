// Messages publics : formulaires Contact et Suggestions/Plaintes.
// Création ouverte à tous ; lecture et traitement réservés à l'admin.
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAdmin } from '../middlewares/auth.js';

const router = Router();

const TYPES_ALLOWED = ['contact', 'suggestion', 'plainte'];

const SELECT_FIELDS = `
  id, type, name, email, subject, body,
  is_handled AS isHandled, created_at AS createdAt
`;

function isValidEmail(email) {
  return typeof email === 'string'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.length <= 254;
}

// Création publique d'un message.
router.post('/', async (req, res, next) => {
  try {
    const { type, name, email, subject, body } = req.body ?? {};

    const messageType = TYPES_ALLOWED.includes(type) ? type : 'contact';
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Le nom est requis (2 caractères minimum)' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email invalide' });
    }
    if (typeof body !== 'string' || body.trim().length < 10) {
      return res.status(400).json({ message: 'Le message doit faire au moins 10 caractères' });
    }

    const result = await db.prepare(
      `INSERT INTO messages (type, name, email, subject, body)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      messageType,
      name.trim(),
      email.trim(),
      typeof subject === 'string' && subject.trim() ? subject.trim() : null,
      body.trim(),
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

// Liste admin, filtrable par type (?type=contact|suggestion|plainte).
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { type } = req.query;
    const rows = TYPES_ALLOWED.includes(type)
      ? await db.prepare(`SELECT ${SELECT_FIELDS} FROM messages WHERE type = ? ORDER BY created_at DESC`).all(type)
      : await db.prepare(`SELECT ${SELECT_FIELDS} FROM messages ORDER BY created_at DESC`).all();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Marque un message comme traité.
router.post('/:id/handle', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const info = await db.prepare('UPDATE messages SET is_handled = 1 WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ message: 'Message introuvable' });
    res.json({ id, isHandled: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const info = await db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ message: 'Message introuvable' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
