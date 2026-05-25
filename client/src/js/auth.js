// Stockage local du JWT + utilitaires d'authentification côté client.
// Le token est en localStorage : simple à mettre en œuvre et pédagogique.
// Toutes les données rendues dans le DOM sont échappées pour limiter les risques XSS.

const TOKEN_KEY = 'petsbook.token';
const USER_KEY = 'petsbook.user';

export const auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  },

  isAdmin() {
    return this.getUser()?.role === 'admin';
  },

  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
