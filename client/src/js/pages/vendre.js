// Page Mettre en vente — création d'annonce marketplace avec upload de photos.
// Accessible uniquement connecté (sinon redirection vers /login avec retour ici).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { escapeHtml } from '../shop-view.js';

if (!auth.isAuthenticated()) {
  window.location.replace(`/login.html?redirect=${encodeURIComponent('/vendre.html')}`);
}

const form = document.getElementById('sell-form');
const feedback = document.getElementById('form-feedback');
const submitBtn = document.getElementById('submit-btn');
const photosInput = document.getElementById('photos');
const previews = document.getElementById('photo-previews');

const MAX_PHOTOS = 3;
const MAX_SIZE = 5 * 1024 * 1024;

// Fichiers retenus (l'input file est en lecture seule, on garde notre propre liste).
let selectedFiles = [];

function setError(id, message) {
  const error = document.getElementById(`${id}-error`);
  if (error) error.textContent = message;
  document.getElementById(id)?.setAttribute('aria-invalid', 'true');
}

function clearErrors() {
  form.querySelectorAll('.form__error').forEach((el) => { el.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}

function setFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = `auth-feedback auth-feedback--${type}`;
}

// -----------------------------------------------------------------------------
// Aperçu des photos sélectionnées (avec suppression individuelle)
// -----------------------------------------------------------------------------

function renderPreviews() {
  previews.innerHTML = selectedFiles.map((file, index) => `
    <figure class="vendre__preview">
      <img src="${URL.createObjectURL(file)}" alt="Aperçu photo ${index + 1}" />
      <figcaption>${index === 0 ? 'Photo principale' : `Photo ${index + 1}`}</figcaption>
      <button type="button" class="vendre__preview-remove" data-index="${index}" aria-label="Retirer ${escapeHtml(file.name)}">&times;</button>
    </figure>
  `).join('');
}

photosInput.addEventListener('change', () => {
  const incoming = Array.from(photosInput.files || []);
  for (const file of incoming) {
    if (selectedFiles.length >= MAX_PHOTOS) break;
    if (file.size > MAX_SIZE) {
      setError('photos', `« ${file.name} » dépasse 5 Mo et a été ignorée.`);
      continue;
    }
    selectedFiles.push(file);
  }
  photosInput.value = ''; // permet de re-sélectionner le même fichier après retrait
  renderPreviews();
});

previews.addEventListener('click', (event) => {
  const btn = event.target.closest('.vendre__preview-remove');
  if (!btn) return;
  selectedFiles.splice(Number(btn.dataset.index), 1);
  renderPreviews();
});

// -----------------------------------------------------------------------------
// Soumission — multipart FormData vers POST /listings
// -----------------------------------------------------------------------------

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  feedback.textContent = '';

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const priceEuros = document.getElementById('price').value.replace(',', '.');
  const priceCents = Math.round(Number(priceEuros) * 100);

  let ok = true;
  if (title.length < 3) { setError('title', 'Le titre doit faire au moins 3 caractères.'); ok = false; }
  if (description.length < 10) { setError('description', 'Au moins 10 caractères.'); ok = false; }
  if (!Number.isInteger(priceCents) || priceCents < 0) { setError('price', 'Prix invalide.'); ok = false; }
  if (selectedFiles.length === 0) { setError('photos', 'Ajoutez au moins une photo.'); ok = false; }
  if (!ok) return;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('category', document.getElementById('category').value);
  formData.append('condition', document.getElementById('condition').value);
  formData.append('brand', document.getElementById('brand').value.trim());
  formData.append('priceCents', String(priceCents));
  selectedFiles.forEach((file) => formData.append('photos', file));

  submitBtn.disabled = true;
  submitBtn.textContent = 'Publication...';
  try {
    const { id } = await api.post('/listings', formData);
    setFeedback('Annonce publiée ! Redirection en cours...', 'success');
    setTimeout(() => { window.location.href = `/annonce.html?id=${id}`; }, 800);
  } catch (err) {
    setFeedback(err.message || 'Erreur lors de la publication.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publier l\'annonce';
  }
});
