// Émission et vérification de JWT signés en HS256.
// Le token contient : { sub: userId, role: 'user' | 'admin' }
// Côté client, il est stocké en localStorage et envoyé via l'en-tête
// `Authorization: Bearer <token>`.

import jwt from 'jsonwebtoken';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET manquant ou trop court (minimum 32 caractères).');
  }
  return secret;
}

export function signToken(payload) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
}
