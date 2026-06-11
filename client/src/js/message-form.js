// Logique partagée des formulaires de message (Contact, Suggestions/Plaintes).
// Envoie vers l'API publique POST /messages. Les pages fournissent un formulaire
// avec les champs #name, #email, #body (et éventuellement #subject, #type).
import { api } from './api.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function setupMessageForm({ formId, defaultType = 'contact', successMessage } = {}) {
  const form = document.getElementById(formId);
  if (!form) return;

  const feedback = document.getElementById('form-feedback');
  const submitBtn = document.getElementById('submit-btn');

  const get = (id) => document.getElementById(id);

  function setError(id, message) {
    const error = get(`${id}-error`);
    const input = get(id);
    if (error) error.textContent = message;
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function clearErrors() {
    form.querySelectorAll('.form__error').forEach((el) => { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `auth-feedback auth-feedback--${type}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    feedback.textContent = '';

    const typeField = get('type');
    const values = {
      type: typeField ? typeField.value : defaultType,
      name: get('name').value.trim(),
      email: get('email').value.trim(),
      subject: (get('subject')?.value || '').trim(),
      body: get('body').value.trim(),
    };

    let ok = true;
    if (values.name.length < 2) { setError('name', 'Le nom est requis (2 caractères minimum).'); ok = false; }
    if (!EMAIL_RE.test(values.email)) { setError('email', 'Format d\'email invalide.'); ok = false; }
    if (values.body.length < 10) { setError('body', 'Le message doit faire au moins 10 caractères.'); ok = false; }
    if (!ok) return;

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Envoi...';
    try {
      await api.post('/messages', values);
      setFeedback(successMessage || 'Message envoyé ! Merci pour votre retour.', 'success');
      form.reset();
    } catch (err) {
      setFeedback(err.message || 'Erreur lors de l\'envoi.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}
