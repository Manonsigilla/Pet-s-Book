// Page de connexion — soumet email/mot de passe, stocke le JWT et redirige.
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const feedback = document.getElementById('auth-feedback');
const submitBtn = document.getElementById('submit-btn');

function clearFieldErrors() {
  emailError.textContent = '';
  passwordError.textContent = '';
  emailInput.removeAttribute('aria-invalid');
  passwordInput.removeAttribute('aria-invalid');
}

function setFeedback(message, type = 'error') {
  feedback.textContent = message;
  feedback.className = `auth-feedback auth-feedback--${type}`;
}

function validate(email, password) {
  let ok = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.textContent = 'Format d\'email invalide.';
    emailInput.setAttribute('aria-invalid', 'true');
    ok = false;
  }
  if (password.length === 0) {
    passwordError.textContent = 'Le mot de passe est requis.';
    passwordInput.setAttribute('aria-invalid', 'true');
    ok = false;
  }
  return ok;
}

// Empêche de revenir sur cette page si déjà connecté
if (auth.isAuthenticated()) {
  window.location.replace(getRedirectTarget());
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  // N'autorise que les chemins relatifs internes (sécurité : pas de open redirect)
  if (redirect && /^\/[^/]/.test(redirect)) return redirect;
  return '/index.html';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFieldErrors();
  feedback.textContent = '';

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!validate(email, password)) return;

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Connexion...';

  try {
    const { token, user } = await api.post('/auth/login', { email, password });
    auth.save(token, user);
    setFeedback('Connecté ! Redirection en cours...', 'success');
    setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, 600);
  } catch (err) {
    setFeedback(err.message || 'Erreur lors de la connexion.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
