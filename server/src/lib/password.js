// Hachage de mot de passe en deux temps :
//   1. HMAC-SHA256(password, PEPPER) — le poivre est un secret serveur jamais stocké en BDD
//   2. bcrypt sur la sortie HMAC — bcrypt ajoute automatiquement un sel aléatoire par utilisateur
//
// Pourquoi pas bcrypt seul ? Si la BDD fuite, un attaquant peut tester des mots de passe
// directement. Avec le poivre, il lui faut aussi obtenir la variable d'environnement du serveur.
// Pourquoi HMAC avant ? Pour éviter la limite des 72 octets de bcrypt et pour produire une
// entrée de longueur fixe résistante aux collisions.

import bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';

const BCRYPT_COST = 12;

function getPepper() {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error('PASSWORD_PEPPER manquant ou trop court (minimum 32 caractères).');
  }
  return pepper;
}

function pepperize(password) {
  return createHmac('sha256', getPepper()).update(password, 'utf8').digest('hex');
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Mot de passe invalide.');
  }
  return bcrypt.hash(pepperize(password), BCRYPT_COST);
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false;
  return bcrypt.compare(pepperize(password), storedHash);
}
