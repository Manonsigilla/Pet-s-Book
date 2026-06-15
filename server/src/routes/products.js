import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAdmin } from '../middlewares/auth.js';

const router = Router();

const SELECT_FIELDS = `
  id, name, description, price_cents AS priceCents, stock,
  image_url AS imageUrl, created_at AS createdAt
`;

router.get('/', async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT ${SELECT_FIELDS} FROM products ORDER BY name ASC`
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
    const product = await db.prepare(`SELECT ${SELECT_FIELDS} FROM products WHERE id = ?`).get(id);
    if (!product) return res.status(404).json({ message: 'Produit introuvable' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, description, priceCents, stock, imageUrl } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Le nom du produit est requis' });
    }
    if (typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({ message: 'Description trop courte' });
    }
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      return res.status(400).json({ message: 'Prix invalide' });
    }
    const stockValue = Number.isInteger(stock) && stock >= 0 ? stock : 0;

    const result = await db.prepare(
      `INSERT INTO products (name, description, price_cents, stock, image_url) VALUES (?, ?, ?, ?, ?)`
    ).run(name.trim(), description.trim(), priceCents, stockValue, imageUrl ?? null);
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
    const info = await db.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ message: 'Produit introuvable' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
