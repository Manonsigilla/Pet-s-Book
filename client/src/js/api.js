// Wrapper fetch centralisé. Ajoute automatiquement le JWT en en-tête si présent
// et nettoie le stockage local si le serveur signale un token expiré/invalide.
import { auth } from './auth.js';

const API_BASE = '/api';

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = auth.getToken();
  // FormData (upload de fichiers) : le navigateur fixe lui-même le Content-Type
  // multipart avec son boundary — il ne faut surtout pas le forcer à la main.
  const isFormData = body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    if (response.status === 401 && (error.code === 'TOKEN_EXPIRED' || error.code === 'TOKEN_INVALID')) {
      auth.clear();
    }
    const err = new Error(error.message || `Erreur ${response.status}`);
    err.status = response.status;
    err.code = error.code;
    err.body = error; // corps complet (ex. aperçu d'un profil privé)
    throw err;
  }

  if (response.status === 204) return null;

  // On lit le corps en texte d'abord : un corps vide sur une réponse 2xx
  // (typiquement le back-end momentanément injoignable — redémarrage nodemon
  // en mode watch, ou serveur non démarré) ferait planter response.json() avec
  // un « JSON.parse: unexpected end of data » difficile à diagnostiquer.
  const text = await response.text();
  if (!text) {
    const err = new Error('Réponse vide du serveur. Le back-end est-il bien démarré et joignable ?');
    err.status = response.status;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('Réponse du serveur illisible (JSON invalide).');
    err.status = response.status;
    throw err;
  }
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST', body }),
  put:    (path, body)  => request(path, { method: 'PUT', body }),
  delete: (path)        => request(path, { method: 'DELETE' }),
};
