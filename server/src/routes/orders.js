// Commandes du marketplace — séquestre simulé type Vinted.
//
// Cycle de vie :
//   paid      → l'acheteur a « payé », le montant est retenu, l'annonce passe en réservé
//   shipped   → le vendeur a expédié l'article
//   received  → l'acheteur confirme la réception, le vendeur est « crédité », annonce vendue
//   cancelled → annulation (tant que non expédié), l'annonce redevient active
//
// Aucun vrai paiement : le projet est une démonstration pédagogique.

import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

const SELECT_FIELDS = `
  o.id, o.status, o.created_at AS createdAt, o.updated_at AS updatedAt,
  o.listing_id AS listingId, l.title, l.price_cents AS priceCents,
  o.buyer_id AS buyerId, b.display_name AS buyerName,
  l.seller_id AS sellerId,
  COALESCE(s.display_name, sp.name) AS sellerName,
  CASE WHEN l.seller_page_id IS NOT NULL THEN 1 ELSE 0 END AS isPro,
  (SELECT url FROM listing_images li WHERE li.listing_id = l.id ORDER BY position ASC LIMIT 1) AS imageUrl
`;

// Le vendeur d'une commande est soit un particulier (users), soit un pro (pages).
const BASE_QUERY = `
  SELECT ${SELECT_FIELDS}
  FROM orders o
  JOIN listings l ON l.id = o.listing_id
  JOIN users b ON b.id = o.buyer_id
  LEFT JOIN users s ON s.id = l.seller_id
  LEFT JOIN pages sp ON sp.id = l.seller_page_id
`;

async function getOrder(id) {
  return db.prepare(`${BASE_QUERY} WHERE o.id = ?`).get(id);
}

async function setStatus(id, status) {
  await db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
}

// -----------------------------------------------------------------------------
// Achat : crée la commande (paiement simulé retenu) et réserve l'annonce
// -----------------------------------------------------------------------------
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const listingId = Number(req.body?.listingId);
    if (!Number.isInteger(listingId) || listingId < 1) {
      return res.status(400).json({ message: 'Annonce invalide' });
    }
    const listing = await db.prepare('SELECT id, seller_id, seller_page_id, status FROM listings WHERE id = ?').get(listingId);
    if (!listing) return res.status(404).json({ message: 'Annonce introuvable' });

    // Achat direct chez un professionnel : pas de séquestre, commande complétée
    // immédiatement. L'article pro reste disponible (logique de stock).
    if (listing.seller_page_id !== null) {
      const result = await db.prepare(
        "INSERT INTO orders (listing_id, buyer_id, status) VALUES (?, ?, 'completed')"
      ).run(listingId, req.user.id);
      return res.status(201).json({ id: result.lastInsertRowid, status: 'completed' });
    }

    // Vente entre particuliers : séquestre simulé.
    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas acheter votre propre annonce' });
    }
    if (listing.status !== 'active') {
      return res.status(409).json({ message: 'Cet article n\'est plus disponible' });
    }

    // Transaction : créer la commande et réserver l'annonce d'un seul tenant.
    const buy = db.transaction(async () => {
      const result = await db.prepare(
        'INSERT INTO orders (listing_id, buyer_id) VALUES (?, ?)'
      ).run(listingId, req.user.id);
      await db.prepare("UPDATE listings SET status = 'reserved' WHERE id = ?").run(listingId);
      return result.lastInsertRowid;
    });
    res.status(201).json({ id: await buy(), status: 'paid' });
  } catch (err) {
    next(err);
  }
});

// Mes achats (en tant qu'acheteur).
router.get('/purchases', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.prepare(`${BASE_QUERY} WHERE o.buyer_id = ? ORDER BY o.created_at DESC`).all(req.user.id);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Mes ventes (commandes passées sur mes annonces).
router.get('/sales', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.prepare(`${BASE_QUERY} WHERE l.seller_id = ? ORDER BY o.created_at DESC`).all(req.user.id);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Transitions d'état
// -----------------------------------------------------------------------------

// Le vendeur marque la commande comme expédiée.
router.post('/:id/ship', requireAuth, async (req, res, next) => {
  try {
    const order = await getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });
    if (order.sellerId !== req.user.id) return res.status(403).json({ message: 'Action réservée au vendeur' });
    if (order.status !== 'paid') return res.status(409).json({ message: 'Cette commande ne peut pas être expédiée' });
    await setStatus(order.id, 'shipped');
    res.json({ id: order.id, status: 'shipped' });
  } catch (err) {
    next(err);
  }
});

// L'acheteur confirme la réception : le paiement est « libéré » au vendeur.
router.post('/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const order = await getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });
    if (order.buyerId !== req.user.id) return res.status(403).json({ message: 'Action réservée à l\'acheteur' });
    if (order.status !== 'shipped') return res.status(409).json({ message: 'La commande n\'est pas encore expédiée' });

    const confirm = db.transaction(async () => {
      await setStatus(order.id, 'received');
      await db.prepare("UPDATE listings SET status = 'sold' WHERE id = ?").run(order.listingId);
    });
    await confirm();
    res.json({ id: order.id, status: 'received' });
  } catch (err) {
    next(err);
  }
});

// Annulation (acheteur ou vendeur) tant que l'article n'est pas expédié.
router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const order = await getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      return res.status(403).json({ message: 'Action non autorisée' });
    }
    if (order.status !== 'paid') {
      return res.status(409).json({ message: 'Cette commande ne peut plus être annulée' });
    }

    const cancel = db.transaction(async () => {
      await setStatus(order.id, 'cancelled');
      await db.prepare("UPDATE listings SET status = 'active' WHERE id = ?").run(order.listingId);
    });
    await cancel();
    res.json({ id: order.id, status: 'cancelled' });
  } catch (err) {
    next(err);
  }
});

export default router;
