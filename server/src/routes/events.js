import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireAdmin, attachUser } from '../middlewares/auth.js';

const router = Router();

// Champs d'un évènement enrichis : nombre d'inscrits, statut d'inscription du
// membre connecté, et synthèse des avis (note moyenne + nombre). Le « ? » porte
// l'id du membre (0 = visiteur non connecté → isRegistered toujours 0).
const SELECT_FIELDS = `
  e.id, e.title, e.description, e.location, e.starts_at AS startsAt,
  e.image_url AS imageUrl, e.created_at AS createdAt,
  (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) AS attendeeCount,
  EXISTS(SELECT 1 FROM event_registrations r WHERE r.event_id = e.id AND r.user_id = ?) AS isRegistered,
  (SELECT COUNT(*) FROM event_reviews rv WHERE rv.event_id = e.id) AS reviewCount,
  (SELECT ROUND(AVG(rv.rating), 1) FROM event_reviews rv WHERE rv.event_id = e.id) AS avgRating
`;

// Champs simples (sans données d'inscription) pour les contextes publics légers.
const BASIC_FIELDS = `
  id, title, description, location, starts_at AS startsAt,
  image_url AS imageUrl, created_at AS createdAt
`;

async function attendeeCount(eventId) {
  const { n } = await db.prepare(
    'SELECT COUNT(*) AS n FROM event_registrations WHERE event_id = ?'
  ).get(eventId);
  return n;
}

// Agenda complet, enrichi pour le membre connecté (compteur + « je suis inscrit »).
router.get('/', attachUser, async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT ${SELECT_FIELDS} FROM events e ORDER BY e.starts_at ASC`
    ).all(req.user?.id ?? 0);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/upcoming', async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT ${BASIC_FIELDS} FROM events WHERE starts_at >= datetime('now') ORDER BY starts_at ASC LIMIT 5`
    ).all();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', attachUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const event = await db.prepare(
      `SELECT ${SELECT_FIELDS} FROM events e WHERE e.id = ?`
    ).get(req.user?.id ?? 0, id);
    if (!event) return res.status(404).json({ message: 'Évènement introuvable' });
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

// -----------------------------------------------------------------------------
// Inscription d'un membre à un évènement (et désinscription)
// -----------------------------------------------------------------------------

// S'inscrire. Idempotent : une 2e inscription ne crée pas de doublon (UNIQUE).
router.post('/:id/register', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const event = await db.prepare('SELECT id FROM events WHERE id = ?').get(id);
    if (!event) return res.status(404).json({ message: 'Évènement introuvable' });

    await db.prepare(
      'INSERT OR IGNORE INTO event_registrations (event_id, user_id) VALUES (?, ?)'
    ).run(id, req.user.id);
    res.status(201).json({ id, isRegistered: 1, attendeeCount: await attendeeCount(id) });
  } catch (err) {
    next(err);
  }
});

// Se désinscrire. Idempotent : ne renvoie pas d'erreur si on n'était pas inscrit.
router.delete('/:id/register', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    await db.prepare(
      'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?'
    ).run(id, req.user.id);
    res.json({ id, isRegistered: 0, attendeeCount: await attendeeCount(id) });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Avis sur un évènement passé (note 1–5 + commentaire facultatif)
// -----------------------------------------------------------------------------

async function reviewStats(eventId) {
  const row = await db.prepare(
    'SELECT COUNT(*) AS reviewCount, ROUND(AVG(rating), 1) AS avgRating FROM event_reviews WHERE event_id = ?'
  ).get(eventId);
  return { reviewCount: row.reviewCount, avgRating: row.avgRating };
}

// Liste publique des avis d'un évènement (+ mon avis si je suis connecté).
router.get('/:id/reviews', attachUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const event = await db.prepare('SELECT id FROM events WHERE id = ?').get(id);
    if (!event) return res.status(404).json({ message: 'Évènement introuvable' });

    const reviews = await db.prepare(
      `SELECT rv.id, rv.rating, rv.comment, rv.created_at AS createdAt,
              u.display_name AS reviewerName
       FROM event_reviews rv JOIN users u ON u.id = rv.user_id
       WHERE rv.event_id = ? ORDER BY rv.created_at DESC`
    ).all(id);

    let myReview = null;
    if (req.user) {
      myReview = await db.prepare(
        'SELECT rating, comment FROM event_reviews WHERE event_id = ? AND user_id = ?'
      ).get(id, req.user.id) ?? null;
    }
    res.json({ ...(await reviewStats(id)), reviews, myReview });
  } catch (err) {
    next(err);
  }
});

// Laisser (ou mettre à jour) son avis. Réservé aux membres INSCRITS, et
// uniquement une fois l'évènement PASSÉ.
router.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const event = await db.prepare(
      "SELECT id, (starts_at < datetime('now')) AS isPast FROM events WHERE id = ?"
    ).get(id);
    if (!event) return res.status(404).json({ message: 'Évènement introuvable' });
    if (!event.isPast) {
      return res.status(403).json({ message: 'On ne peut donner un avis qu\'une fois l\'évènement passé' });
    }
    const registered = await db.prepare(
      'SELECT 1 AS ok FROM event_registrations WHERE event_id = ? AND user_id = ?'
    ).get(id, req.user.id);
    if (!registered) {
      return res.status(403).json({ message: 'Seuls les participants inscrits peuvent laisser un avis' });
    }

    // Note obligatoire (1–5) : sans étoiles, on renvoie l'avertissement attendu.
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Cochez le nombre d\'étoiles que vous souhaitez attribuer' });
    }
    const raw = req.body?.comment;
    const comment = typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 2000) : null;

    await db.prepare(
      `INSERT INTO event_reviews (event_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(event_id, user_id)
       DO UPDATE SET rating = excluded.rating, comment = excluded.comment, updated_at = CURRENT_TIMESTAMP`
    ).run(id, req.user.id, rating, comment);

    res.status(201).json({ id, rating, comment, ...(await reviewStats(id)) });
  } catch (err) {
    next(err);
  }
});

// Supprimer son propre avis.
router.delete('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    await db.prepare(
      'DELETE FROM event_reviews WHERE event_id = ? AND user_id = ?'
    ).run(id, req.user.id);
    res.json({ id, ...(await reviewStats(id)) });
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
    if (info.changes === 0) return res.status(404).json({ message: 'Évènement introuvable' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
