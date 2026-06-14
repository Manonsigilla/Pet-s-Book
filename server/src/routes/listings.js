// Marketplace Pet's Shop — annonces publiées par les utilisateurs.
// Lecture publique ; création/suppression réservées au vendeur connecté.
import { Router } from 'express';
import { unlink } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { db } from '../db/database.js';
import { requireAuth } from '../middlewares/auth.js';
import { uploadListingPhotos, UPLOAD_DIR } from '../lib/upload.js';

const router = Router();

const CATEGORIES = ['accessoire', 'jouet', 'alimentation', 'habitat', 'hygiene', 'autre'];
const CONDITIONS = ['neuf', 'tres-bon', 'bon', 'correct'];

const SELECT_FIELDS = `
  l.id, l.title, l.description, l.category, l.brand, l.condition,
  l.price_cents AS priceCents, l.status, l.created_at AS createdAt,
  l.seller_id AS sellerId, l.seller_page_id AS sellerPageId,
  COALESCE(u.display_name, pg.name) AS sellerName,
  pg.website AS sellerWebsite,
  CASE WHEN l.seller_page_id IS NOT NULL THEN 1 ELSE 0 END AS isPro
`;

// Le vendeur est soit un particulier (users), soit un professionnel (pages).
const LISTING_JOINS = `
  FROM listings l
  LEFT JOIN users u ON u.id = l.seller_id
  LEFT JOIN pages pg ON pg.id = l.seller_page_id
`;

function attachImages(listings) {
  if (listings.length === 0) return listings;
  const ids = listings.map((l) => l.id);
  const placeholders = ids.map(() => '?').join(',');
  const images = db.prepare(
    `SELECT listing_id AS listingId, url FROM listing_images
     WHERE listing_id IN (${placeholders}) ORDER BY position ASC`
  ).all(...ids);
  const byListing = new Map();
  for (const img of images) {
    if (!byListing.has(img.listingId)) byListing.set(img.listingId, []);
    byListing.get(img.listingId).push(img.url);
  }
  return listings.map((l) => ({ ...l, images: byListing.get(l.id) ?? [] }));
}

// -----------------------------------------------------------------------------
// Listing public — annonces actives ou réservées (les vendues sont masquées)
// -----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { category, q } = req.query;
  let sql = `SELECT ${SELECT_FIELDS} ${LISTING_JOINS} WHERE l.status != 'sold'`;
  const params = [];
  if (CATEGORIES.includes(category)) {
    sql += ' AND l.category = ?';
    params.push(category);
  }
  if (typeof q === 'string' && q.trim()) {
    sql += ' AND (l.title LIKE ? OR l.description LIKE ? OR l.brand LIKE ?)';
    const like = `%${q.trim()}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY l.created_at DESC';
  res.json(attachImages(db.prepare(sql).all(...params)));
});

// Mes annonces (toutes, y compris vendues) — pour « Gérer mes ventes ».
router.get('/mine', requireAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT ${SELECT_FIELDS} ${LISTING_JOINS}
     WHERE l.seller_id = ? ORDER BY l.created_at DESC`
  ).all(req.user.id);
  res.json(attachImages(rows));
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  const listing = db.prepare(
    `SELECT ${SELECT_FIELDS} ${LISTING_JOINS} WHERE l.id = ?`
  ).get(id);
  if (!listing) return res.status(404).json({ message: 'Annonce introuvable' });
  res.json(attachImages([listing])[0]);
});

// -----------------------------------------------------------------------------
// Création — multipart (champs + photos), réservée aux connectés
// -----------------------------------------------------------------------------
router.post('/', requireAuth, (req, res, next) => {
  uploadListingPhotos(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'Téléversement refusé' });
    }
    try {
      const { title, description, category, brand, condition, priceCents } = req.body ?? {};
      const price = Number(priceCents);

      if (typeof title !== 'string' || title.trim().length < 3) {
        return res.status(400).json({ message: 'Le titre est requis (3 caractères minimum)' });
      }
      if (typeof description !== 'string' || description.trim().length < 10) {
        return res.status(400).json({ message: 'La description doit faire au moins 10 caractères' });
      }
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Catégorie invalide' });
      }
      if (!CONDITIONS.includes(condition)) {
        return res.status(400).json({ message: 'État invalide' });
      }
      if (!Number.isInteger(price) || price < 0 || price > 10000000) {
        return res.status(400).json({ message: 'Prix invalide' });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Ajoutez au moins une photo' });
      }

      const result = db.prepare(
        `INSERT INTO listings (seller_id, title, description, category, brand, condition, price_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        req.user.id, title.trim(), description.trim(), category,
        typeof brand === 'string' && brand.trim() ? brand.trim() : null,
        condition, price,
      );

      const insertImage = db.prepare(
        'INSERT INTO listing_images (listing_id, url, position) VALUES (?, ?, ?)'
      );
      req.files.forEach((file, index) => {
        insertImage.run(result.lastInsertRowid, `/uploads/${file.filename}`, index);
      });

      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err) {
      next(err);
    }
  });
});

// -----------------------------------------------------------------------------
// Suppression — vendeur propriétaire ou admin ; interdite si une vente est en cours
// -----------------------------------------------------------------------------
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const listing = db.prepare('SELECT seller_id, status FROM listings WHERE id = ?').get(id);
    if (!listing) return res.status(404).json({ message: 'Annonce introuvable' });
    if (listing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Suppression non autorisée' });
    }
    const activeOrder = db.prepare(
      `SELECT id FROM orders WHERE listing_id = ? AND status IN ('paid', 'shipped')`
    ).get(id);
    if (activeOrder) {
      return res.status(409).json({ message: 'Impossible de supprimer : une vente est en cours sur cette annonce' });
    }

    // Supprime les fichiers photo du disque (best-effort), puis l'annonce (cascade).
    const images = db.prepare('SELECT url FROM listing_images WHERE listing_id = ?').all(id);
    db.prepare('DELETE FROM listings WHERE id = ?').run(id);
    for (const { url } of images) {
      if (url.startsWith('/uploads/')) {
        await unlink(resolve(UPLOAD_DIR, basename(url))).catch(() => {});
      }
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
