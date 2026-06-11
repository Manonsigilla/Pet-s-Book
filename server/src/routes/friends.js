// Réseau « copain/copine » — amitiés ENTRE ANIMAUX.
// Le membre agit au nom de l'un de ses animaux : demandes, acceptation,
// liste des copains et suggestions (localisation + copains en commun).
import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

const PREVIEW_FIELDS = `
  a.id, a.name, a.species, a.breed, a.gender, a.age,
  a.image_url AS imageUrl, a.location, u.display_name AS ownerName
`;

function myAnimalIds(userId) {
  return db.prepare('SELECT id FROM animals WHERE owner_id = ?').all(userId).map((r) => r.id);
}

function animalPreviews(ids) {
  if (ids.length === 0) return new Map();
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT ${PREVIEW_FIELDS} FROM animals a LEFT JOIN users u ON u.id = a.owner_id
     WHERE a.id IN (${placeholders})`
  ).all(...ids);
  return new Map(rows.map((r) => [r.id, r]));
}

// Toutes les amitiés (un statut donné) impliquant une liste d'animaux.
function friendshipsOf(ids, status) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(
    `SELECT id, requester_animal_id AS requesterId, addressee_animal_id AS addresseeId, status
     FROM friendships
     WHERE status = ? AND (requester_animal_id IN (${placeholders}) OR addressee_animal_id IN (${placeholders}))`
  ).all(status, ...ids, ...ids);
}

// -----------------------------------------------------------------------------
// GET /friends — les copains de mes animaux (profils complets accessibles)
// -----------------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const mine = myAnimalIds(req.user.id);
  const mineSet = new Set(mine);
  const links = friendshipsOf(mine, 'accepted');

  // animal copain -> avec lequel de mes animaux
  const pairs = [];
  for (const f of links) {
    const other = mineSet.has(f.requesterId) ? f.addresseeId : f.requesterId;
    if (mineSet.has(other)) continue; // amitié entre deux de mes animaux
    pairs.push({ otherId: other, withMyAnimalId: mineSet.has(f.requesterId) ? f.requesterId : f.addresseeId });
  }

  const previews = animalPreviews([...new Set([...pairs.map((p) => p.otherId), ...mine])]);
  const seen = new Set();
  const friends = [];
  for (const { otherId, withMyAnimalId } of pairs) {
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    friends.push({
      ...previews.get(otherId),
      withMyAnimalId,
      withMyAnimalName: previews.get(withMyAnimalId)?.name ?? null,
    });
  }
  friends.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  res.json(friends);
});

// -----------------------------------------------------------------------------
// GET /friends/requests — demandes reçues (pour mes animaux) et envoyées
// -----------------------------------------------------------------------------
router.get('/requests', requireAuth, (req, res) => {
  const mine = myAnimalIds(req.user.id);
  const mineSet = new Set(mine);
  const pending = friendshipsOf(mine, 'pending');

  const received = pending.filter((f) => mineSet.has(f.addresseeId));
  const sent = pending.filter((f) => mineSet.has(f.requesterId));
  const previews = animalPreviews([
    ...new Set([...pending.flatMap((f) => [f.requesterId, f.addresseeId])]),
  ]);

  res.json({
    received: received.map((f) => ({
      id: f.id,
      from: previews.get(f.requesterId) ?? null,
      toMyAnimal: previews.get(f.addresseeId) ?? null,
    })),
    sent: sent.map((f) => ({
      id: f.id,
      to: previews.get(f.addresseeId) ?? null,
      fromMyAnimal: previews.get(f.requesterId) ?? null,
    })),
  });
});

// -----------------------------------------------------------------------------
// POST /friends/requests — envoyer une demande au nom d'un de mes animaux
// -----------------------------------------------------------------------------
router.post('/requests', requireAuth, (req, res, next) => {
  try {
    const fromAnimalId = Number(req.body?.fromAnimalId);
    const toAnimalId = Number(req.body?.toAnimalId);
    if (!Number.isInteger(fromAnimalId) || !Number.isInteger(toAnimalId)) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const from = db.prepare('SELECT id, owner_id FROM animals WHERE id = ?').get(fromAnimalId);
    const to = db.prepare('SELECT id, owner_id, friend_policy FROM animals WHERE id = ?').get(toAnimalId);
    if (!from || !to) return res.status(404).json({ message: 'Animal introuvable' });
    if (from.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Vous ne pouvez agir qu\'au nom de vos propres animaux' });
    }
    if (to.owner_id === req.user.id) {
      return res.status(400).json({ message: 'Vos animaux se connaissent déjà à la maison 😄' });
    }

    // Préférence du destinataire : qui peut demander en copain ?
    if (to.friend_policy === 'nobody') {
      return res.status(403).json({ message: 'Ce profil n\'accepte pas de nouvelles demandes pour le moment' });
    }
    if (to.friend_policy === 'friends-of-friends') {
      const mutual = db.prepare(
        `SELECT 1 FROM friendships f1
         JOIN friendships f2 ON f2.status = 'accepted'
           AND (f2.requester_animal_id IN (f1.requester_animal_id, f1.addressee_animal_id)
             OR f2.addressee_animal_id IN (f1.requester_animal_id, f1.addressee_animal_id))
         WHERE f1.status = 'accepted'
           AND (f1.requester_animal_id = @from OR f1.addressee_animal_id = @from)
           AND (f2.requester_animal_id = @to OR f2.addressee_animal_id = @to)
         LIMIT 1`
      ).get({ from: fromAnimalId, to: toAnimalId });
      if (!mutual) {
        return res.status(403).json({ message: 'Ce profil n\'accepte que les copains de ses copains' });
      }
    }

    const existing = db.prepare(
      `SELECT id, status FROM friendships
       WHERE (requester_animal_id = @a AND addressee_animal_id = @b)
          OR (requester_animal_id = @b AND addressee_animal_id = @a)`
    ).get({ a: fromAnimalId, b: toAnimalId });

    if (existing?.status === 'accepted') {
      return res.status(409).json({ message: 'Ils sont déjà copains !' });
    }
    if (existing?.status === 'pending') {
      return res.status(409).json({ message: 'Une demande est déjà en attente' });
    }
    if (existing?.status === 'refused') {
      // On retente sa chance : la demande repart dans le sens actuel.
      db.prepare(
        `UPDATE friendships
         SET requester_animal_id = ?, addressee_animal_id = ?, status = 'pending', responded_at = NULL
         WHERE id = ?`
      ).run(fromAnimalId, toAnimalId, existing.id);
      return res.status(201).json({ id: existing.id });
    }

    const result = db.prepare(
      'INSERT INTO friendships (requester_animal_id, addressee_animal_id) VALUES (?, ?)'
    ).run(fromAnimalId, toAnimalId);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

// Accepter / refuser — réservé au propriétaire de l'animal destinataire.
function respond(status) {
  return (req, res) => {
    const id = Number(req.params.id);
    const f = db.prepare(
      `SELECT f.id, f.status, a.owner_id AS addresseeOwner
       FROM friendships f JOIN animals a ON a.id = f.addressee_animal_id
       WHERE f.id = ?`
    ).get(id);
    if (!f) return res.status(404).json({ message: 'Demande introuvable' });
    if (f.addresseeOwner !== req.user.id) {
      return res.status(403).json({ message: 'Seul le propriétaire de l\'animal sollicité peut répondre' });
    }
    if (f.status !== 'pending') {
      return res.status(409).json({ message: 'Cette demande a déjà reçu une réponse' });
    }
    db.prepare(
      'UPDATE friendships SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, id);
    res.json({ id, status });
  };
}
router.post('/requests/:id/accept', requireAuth, respond('accepted'));
router.post('/requests/:id/refuse', requireAuth, respond('refused'));

// -----------------------------------------------------------------------------
// GET /friends/suggestions — copains potentiels pour mes animaux
//   priorité : copains en commun, puis même coin (localisation), puis découverte
// -----------------------------------------------------------------------------

// Découpe une localisation en mots significatifs (« Austin (TX) » -> austin, tx).
function locationTokens(location) {
  if (!location) return [];
  return location.toLowerCase().split(/[^a-zà-ÿ]+/).filter((w) => w.length >= 3);
}

router.get('/suggestions', requireAuth, (req, res) => {
  const mine = myAnimalIds(req.user.id);
  if (mine.length === 0) return res.json([]);
  const mineSet = new Set(mine);

  // Animaux déjà liés à l'un des miens (quel que soit le statut) : exclus.
  const placeholders = mine.map(() => '?').join(',');
  const linked = new Set(
    db.prepare(
      `SELECT requester_animal_id AS a, addressee_animal_id AS b FROM friendships
       WHERE requester_animal_id IN (${placeholders}) OR addressee_animal_id IN (${placeholders})`
    ).all(...mine, ...mine).flatMap((r) => [r.a, r.b]),
  );

  // Mes copains actuels (pour compter les copains en commun des candidats).
  const myFriends = new Set(
    friendshipsOf(mine, 'accepted').map((f) => (mineSet.has(f.requesterId) ? f.addresseeId : f.requesterId)),
  );

  const myLocations = db.prepare(
    `SELECT location FROM animals WHERE id IN (${placeholders})`
  ).all(...mine).flatMap((r) => locationTokens(r.location));
  const myLocationSet = new Set(myLocations);

  const candidates = db.prepare(
    `SELECT ${PREVIEW_FIELDS} FROM animals a LEFT JOIN users u ON u.id = a.owner_id
     WHERE a.owner_id IS NOT NULL AND a.owner_id != ?
       AND a.friend_policy != 'nobody'`
  ).all(req.user.id).filter((a) => !linked.has(a.id) && !mineSet.has(a.id));

  // Copains de chaque candidat (une requête globale, comptage en mémoire).
  const allAccepted = db.prepare(
    `SELECT requester_animal_id AS a, addressee_animal_id AS b FROM friendships WHERE status = 'accepted'`
  ).all();
  const friendsByAnimal = new Map();
  for (const { a, b } of allAccepted) {
    if (!friendsByAnimal.has(a)) friendsByAnimal.set(a, new Set());
    if (!friendsByAnimal.has(b)) friendsByAnimal.set(b, new Set());
    friendsByAnimal.get(a).add(b);
    friendsByAnimal.get(b).add(a);
  }

  const scored = candidates.map((a) => {
    const theirFriends = friendsByAnimal.get(a.id) ?? new Set();
    let mutualCount = 0;
    for (const fid of theirFriends) if (myFriends.has(fid)) mutualCount += 1;
    const sameLocation = locationTokens(a.location).some((t) => myLocationSet.has(t));
    return { ...a, mutualCount, sameLocation, score: mutualCount * 3 + (sameLocation ? 2 : 0) };
  });

  scored.sort((x, y) => y.score - x.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 8);
  // Complète avec de la découverte si les critères ne suffisent pas.
  for (const s of scored) {
    if (top.length >= 8) break;
    if (!top.includes(s)) top.push(s);
  }
  res.json(top.map(({ score, ...rest }) => rest));
});

export default router;
