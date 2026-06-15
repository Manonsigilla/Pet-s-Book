// Messagerie du marketplace — conversations entre acheteur potentiel et vendeur,
// démarrées depuis une annonce (« Contacter le vendeur »).
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

async function getConversation(id) {
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

function isParticipant(conv, userId) {
  return conv.buyer_id === userId || conv.seller_id === userId;
}

// -----------------------------------------------------------------------------
// Boîte de réception : mes conversations, dernière réponse et non-lus en premier
// -----------------------------------------------------------------------------
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT
         c.id, c.listing_id AS listingId, c.created_at AS createdAt,
         l.title AS listingTitle, l.status AS listingStatus,
         (SELECT url FROM listing_images li WHERE li.listing_id = l.id ORDER BY position ASC LIMIT 1) AS listingImage,
         CASE WHEN c.buyer_id = @me THEN s.display_name ELSE b.display_name END AS otherName,
         (SELECT body FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS lastMessage,
         (SELECT created_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS lastMessageAt,
         (SELECT COUNT(*) FROM chat_messages m
          WHERE m.conversation_id = c.id AND m.sender_id != @me AND m.read_at IS NULL) AS unreadCount
       FROM conversations c
       JOIN users b ON b.id = c.buyer_id
       JOIN users s ON s.id = c.seller_id
       LEFT JOIN listings l ON l.id = c.listing_id
       WHERE c.buyer_id = @me OR c.seller_id = @me
       ORDER BY lastMessageAt DESC`
    ).all({ me: req.user.id });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Nombre total de messages non lus (pour le badge du menu).
router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const { count } = await db.prepare(
      `SELECT COUNT(*) AS count FROM chat_messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.buyer_id = ? OR c.seller_id = ?) AND m.sender_id != ? AND m.read_at IS NULL`
    ).get(req.user.id, req.user.id, req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Démarrer (ou reprendre) une conversation depuis une annonce, avec un 1er message
// -----------------------------------------------------------------------------
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const listingId = Number(req.body?.listingId);
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!Number.isInteger(listingId) || listingId < 1) {
      return res.status(400).json({ message: 'Annonce invalide' });
    }
    if (body.length < 1 || body.length > 2000) {
      return res.status(400).json({ message: 'Le message est requis (2000 caractères max)' });
    }
    const listing = await db.prepare('SELECT id, seller_id FROM listings WHERE id = ?').get(listingId);
    if (!listing) return res.status(404).json({ message: 'Annonce introuvable' });
    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ message: 'Vous êtes le vendeur de cette annonce' });
    }

    // Réutilise la conversation existante pour ce couple (annonce, acheteur).
    let conv = await db.prepare(
      'SELECT id FROM conversations WHERE listing_id = ? AND buyer_id = ?'
    ).get(listingId, req.user.id);
    if (!conv) {
      const result = await db.prepare(
        'INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES (?, ?, ?)'
      ).run(listingId, req.user.id, listing.seller_id);
      conv = { id: result.lastInsertRowid };
    }

    await db.prepare(
      'INSERT INTO chat_messages (conversation_id, sender_id, body) VALUES (?, ?, ?)'
    ).run(conv.id, req.user.id, body);

    res.status(201).json({ conversationId: conv.id });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Fil d'une conversation — réservé aux deux participants
// -----------------------------------------------------------------------------
router.get('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const conv = await getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ message: 'Conversation introuvable' });
    if (!isParticipant(conv, req.user.id)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Les messages de l'autre participant sont marqués lus à l'ouverture du fil.
    await db.prepare(
      `UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`
    ).run(conv.id, req.user.id);

    const messages = await db.prepare(
      `SELECT m.id, m.body, m.created_at AS createdAt,
              m.sender_id AS senderId, u.display_name AS senderName
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ? ORDER BY m.created_at ASC, m.id ASC`
    ).all(conv.id);

    res.json({
      id: conv.id,
      listingId: conv.listing_id,
      buyerId: conv.buyer_id,
      sellerId: conv.seller_id,
      messages,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const conv = await getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ message: 'Conversation introuvable' });
    if (!isParticipant(conv, req.user.id)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (body.length < 1 || body.length > 2000) {
      return res.status(400).json({ message: 'Le message est requis (2000 caractères max)' });
    }
    const result = await db.prepare(
      'INSERT INTO chat_messages (conversation_id, sender_id, body) VALUES (?, ?, ?)'
    ).run(conv.id, req.user.id, body);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

export default router;
