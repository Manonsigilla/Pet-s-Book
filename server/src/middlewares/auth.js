// Authentification par JWT (Authorization: Bearer <token>)
import { verifyToken } from '../lib/jwt.js';

function readToken(req) {
  const header = req.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

// Tente de décoder le token et l'attache à req.user, sans bloquer s'il est absent.
// Utile sur les routes publiques où la présence d'un user enrichit la réponse.
export function attachUser(req, res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // Token invalide ou expiré : on continue sans user authentifié.
  }
  next();
}

// Exige un utilisateur authentifié (n'importe quel rôle).
export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentification requise' });
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    res.status(401).json({ message: 'Session expirée ou invalide', code });
  }
}

// Exige le rôle admin.
export function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }
    next();
  });
}
