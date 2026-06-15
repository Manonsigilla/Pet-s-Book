import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAdmin } from '../middlewares/auth.js';

const router = Router();

const SELECT_FIELDS = `
  id, title, description, location, starts_at AS startsAt,
  image_url AS imageUrl, created_at AS createdAt
`;

router.get('/', async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT ${SELECT_FIELDS} FROM events ORDER BY starts_at ASC`
    ).all();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/upcoming', async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT ${SELECT_FIELDS} FROM events WHERE starts_at >= datetime('now') ORDER BY starts_at ASC LIMIT 5`
    ).all();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const event = await db.prepare(`SELECT ${SELECT_FIELDS} FROM events WHERE id = ?`).get(id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { title, description, location, startsAt, imageUrl } = req.body ?? {};
    if (typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({ message: 'Le titre est requis' });
    }
    if (typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ message: 'Description trop courte' });
    }
    if (typeof location !== 'string' || location.trim().length < 2) {
      return res.status(400).json({ message: 'Le lieu est requis' });
    }
    if (!startsAt || Number.isNaN(Date.parse(startsAt))) {
      return res.status(400).json({ message: 'Date invalide' });
    }

    const result = await db.prepare(
      `INSERT INTO events (title, description, location, starts_at, image_url) VALUES (?, ?, ?, ?, ?)`
    ).run(title.trim(), description.trim(), location.trim(), startsAt, imageUrl ?? null);
    res.status(201).json({ id: result.lastInsertRowid });
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
    const info = await db.prepare('DELETE FROM events WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ message: 'Événement introuvable' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
