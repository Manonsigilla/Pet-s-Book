// Widget d'authentification dans l'en-tête, partagé sur toutes les pages.
// Lit l'état de session (localStorage via auth.js) et propose connexion/inscription
// si déconnecté, ou prénom + déconnexion + lien admin (si rôle admin) sinon.
import { auth } from './auth.js';
import { api } from './api.js';
import { appPath } from './utils/path-utils.js';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render() {
  const container = document.getElementById('auth-widget');
  if (!container) return;

  const user = auth.getUser();

  if (!user) {
    container.innerHTML = `
      <a class="auth-widget__link" href="./login.html">Connexion</a>
      <a class="auth-widget__link auth-widget__link--primary" href="./register.html">S'inscrire</a>
    `;
    return;
  }

  const adminLink = user.role === 'admin'
    ? `<a class="auth-widget__link" href="./admin.html">Administration</a>`
    : '';

  container.innerHTML = `
    <span class="auth-widget__greeting">
      Bonjour, <strong>${escapeHtml(user.displayName)}</strong>
    </span>
    <a class="auth-widget__link" href="./mes-animaux.html">Mes animaux</a>
    <a class="auth-widget__link" href="./messages.html">Messages<span class="auth-widget__badge" id="unread-badge" hidden></span></a>
    ${adminLink}
    <button class="auth-widget__logout" type="button" id="logout-btn">Déconnexion</button>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    auth.clear();
    window.location.href = appPath('/index.html');
  });

  refreshUnreadBadge();
}

// Affiche le nombre de messages non lus de la messagerie marketplace.
async function refreshUnreadBadge() {
  try {
    const { count } = await api.get('/conversations/unread-count');
    const badge = document.getElementById('unread-badge');
    if (badge && count > 0) {
      badge.textContent = count;
      badge.hidden = false;
    }
  } catch {
    // Silencieux : le badge est purement informatif.
  }
}

// Vérifie au chargement que le token est toujours valide côté serveur.
// Si le serveur renvoie 401, api.js purge le localStorage et on re-rend.
async function verifyTokenFreshness() {
  if (!auth.isAuthenticated()) return;
  try {
    const fresh = await api.get('/auth/me');
    auth.save(auth.getToken(), fresh);
  } catch (err) {
    if (err.status === 401) render();
  }
}

export function initAuthWidget() {
  render();
  verifyTokenFreshness();
}
