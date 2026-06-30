// Page d'inscription — valide les entrées, crée le compte et connecte automatiquement.
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { appPath } from '../utils/path-utils.js';

const form = document.getElementById('register-form');
const fields = {
  displayName: document.getElementById('displayName'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  passwordConfirm: document.getElementById('passwordConfirm'),
};
const errors = {
  displayName: document.getElementById('displayName-error'),
  email: document.getElementById('email-error'),
  password: document.getElementById('password-error'),
  passwordConfirm: document.getElementById('passwordConfirm-error'),
};
const feedback = document.getElementById('auth-feedback');
const submitBtn = document.getElementById('submit-btn');

if (auth.isAuthenticated()) {
  window.location.replace(appPath('/index.html'));
}

function clearErrors() {
  for (const key of Object.keys(errors)) {
    errors[key].textContent = '';
    fields[key].removeAttribute('aria-invalid');
  }
}

function setError(field, message) {
  errors[field].textContent = message;
  fields[field].setAttribute('aria-invalid', 'true');
}

function setFeedback(message, type = 'error') {
  feedback.textContent = message;
  feedback.className = `auth-feedback auth-feedback--${type}`;
}

function validate(values) {
  let ok = true;
  if (values.displayName.length < 2 || values.displayName.length > 60) {
    setError('displayName', 'Le nom doit faire entre 2 et 60 caractères.');
    ok = false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    setError('email', 'Format d\'email invalide.');
    ok = false;
  }
  if (values.password.length < 8 || !/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    setError('password', 'Au moins 8 caractères dont une lettre et un chiffre.');
    ok = false;
  }
  if (values.password !== values.passwordConfirm) {
    setError('passwordConfirm', 'Les mots de passe ne correspondent pas.');
    ok = false;
  }
  return ok;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  feedback.textContent = '';

  const values = {
    displayName: fields.displayName.value.trim(),
    email: fields.email.value.trim(),
    password: fields.password.value,
    passwordConfirm: fields.passwordConfirm.value,
  };

  if (!validate(values)) return;

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Création...';

  try {
    const { token, user } = await api.post('/auth/register', {
      displayName: values.displayName,
      email: values.email,
      password: values.password,
    });
    auth.save(token, user);
    setFeedback('Compte créé ! Redirection en cours...', 'success');
    setTimeout(() => {
      window.location.href = appPath('/index.html');
    }, 800);
  } catch (err) {
    setFeedback(err.message || 'Erreur lors de l\'inscription.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
