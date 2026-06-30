// Utilitaire de chemin — préfixe automatiquement les URLs avec la base configurée
// dans Vite (/) en développement, (/Pet-s-Book/) en production GitHub Pages.
const BASE = import.meta.env.BASE_URL; // toujours '/' en dev, '/Pet-s-Book/' en prod

/**
 * Prépare un chemin applicatif en lui ajoutant le préfixe de base si nécessaire.
 * Accepte les chemins absolus (/page.html) ou relatifs (page.html).
 * @param {string} path - Le chemin à préfixer
 * @returns {string} Le chemin complet avec la base
 */
export function appPath(path) {
  const clean = path.replace(/^\//, '');
  return `${BASE}${clean}`;
}

/**
 * Chemin de base de l'application.
 * Exemple : '/' en développement, '/Pet-s-Book/' en production.
 */
export const BASE_URL = BASE;
