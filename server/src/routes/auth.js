import { Router } from 'express';
import { db } from '../db/index.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

function isValidEmail(email) {
  return typeof email === 'string'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.length <= 254;
}

// Politique de mot de passe : 8+ caractères, au moins 1 lettre et 1 chiffre.
function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= 8
    && /[A-Za-z]/.test(password)
    && /\d/.test(password);
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  };
}

function issueToken(user) {
  return signToken({ sub: user.id, role: user.role });
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body ?? {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email invalide' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 8 caractères dont une lettre et un chiffre',
      });
    }
    if (typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({ message: 'Nom d\'affichage invalide' });
    }

    const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await hashPassword(password);
    const result = await db
      .prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run(email, passwordHash, displayName.trim());

    const user = {
      id: result.lastInsertRowid,
      email,
      display_name: displayName.trim(),
      role: 'user',
    };
    const token = issueToken({ id: user.id, role: user.role });
    res.status(201).json({ user: publicUser(user), token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || typeof password !== 'string') {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const user = await db
      .prepare('SELECT id, email, password_hash, display_name, role FROM users WHERE email = ?')
      .get(email);

    // Vérifie même quand l'utilisateur n'existe pas, pour éviter la fuite de timing.
    const ok = user
      ? await verifyPassword(password, user.password_hash)
      : await verifyPassword(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinval');

    if (!user || !ok) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const token = issueToken({ id: user.id, role: user.role });
    res.json({ user: publicUser(user), token });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await db
      .prepare('SELECT id, email, display_name, role FROM users WHERE id = ?')
      .get(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

export default router;
