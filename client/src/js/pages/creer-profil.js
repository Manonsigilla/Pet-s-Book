// Page Créer le profil de mon animal — formulaire ciblé animal avec volet
// sensibilisation : champs conditionnels (identification / stérilisation).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';

if (!auth.isAuthenticated()) {
  window.location.replace(`/login.html?redirect=${encodeURIComponent('/creer-profil.html')}`);
}

const form = document.getElementById('profile-form');
const feedback = document.getElementById('form-feedback');
const submitBtn = document.getElementById('submit-btn');
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photo-preview');

const identifiedReasonBlock = document.getElementById('identified-reason-block');
const sterilizedReasonBlock = document.getElementById('sterilized-reason-block');
const sterilizedOtherBlock = document.getElementById('sterilized-other-block');
const sterilizedSelect = document.getElementById('sterilizedReason');
const vaccinatedReasonBlock = document.getElementById('vaccinated-reason-block');

const MAX_SIZE = 5 * 1024 * 1024;
let photoFile = null;

function setError(id, message) {
  const error = document.getElementById(`${id}-error`);
  if (error) error.textContent = message;
}

function clearErrors() {
  form.querySelectorAll('.form__error').forEach((el) => { el.textContent = ''; });
}

function setFeedback(message, type, icon = '') {
  // L'icône est insérée en HTML ; le message reste un nœud texte (pas d'injection).
  feedback.innerHTML = icon ? `<i class="fa-solid ${icon}" aria-hidden="true"></i> ` : '';
  feedback.append(message);
  feedback.className = `auth-feedback auth-feedback--${type}`;
}

// -----------------------------------------------------------------------------
// Photo de profil — aperçu rond
// -----------------------------------------------------------------------------

photoInput.addEventListener('change', () => {
  const file = photoInput.files?.[0];
  setError('photo', '');
  if (!file) return;
  if (file.size > MAX_SIZE) {
    setError('photo', 'La photo dépasse 5 Mo.');
    photoInput.value = '';
    return;
  }
  photoFile = file;
  photoPreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Aperçu de la photo de profil" />`;
});

// -----------------------------------------------------------------------------
// Champs conditionnels (sensibilisation)
// -----------------------------------------------------------------------------

function radioValue(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
}

form.addEventListener('change', (event) => {
  if (event.target.name === 'identified') {
    identifiedReasonBlock.hidden = radioValue('identified') !== '0';
  }
  if (event.target.name === 'sterilized') {
    sterilizedReasonBlock.hidden = radioValue('sterilized') !== '0';
  }
  if (event.target === sterilizedSelect) {
    sterilizedOtherBlock.hidden = sterilizedSelect.value !== 'autre';
  }
  if (event.target.name === 'vaccinated') {
    vaccinatedReasonBlock.hidden = radioValue('vaccinated') !== '0';
  }
});

// -----------------------------------------------------------------------------
// Soumission — multipart vers POST /animals
// -----------------------------------------------------------------------------

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  feedback.textContent = '';

  const name = document.getElementById('name').value.trim();
  const identified = radioValue('identified');
  const sterilized = radioValue('sterilized');
  const vaccinated = radioValue('vaccinated');
  const identifiedReason = document.getElementById('identifiedReason').value.trim();
  const vaccinatedReason = document.getElementById('vaccinatedReason').value.trim();
  let sterilizedReason = sterilizedSelect.value;
  if (sterilizedReason === 'autre') {
    const other = document.getElementById('sterilizedReasonOther').value.trim();
    sterilizedReason = other ? `Autre raison : ${other}` : '';
  }

  let ok = true;
  if (!name) { setError('name', 'Son prénom est requis.'); ok = false; }
  if (identified === null) { setError('identified', 'Répondez oui ou non.'); ok = false; }
  if (identified === '0' && identifiedReason.length < 3) {
    setError('identifiedReason', 'Expliquez en quelques mots (3 caractères minimum).'); ok = false;
  }
  if (sterilized === null) { setError('sterilized', 'Répondez oui ou non.'); ok = false; }
  if (sterilized === '0' && sterilizedReason.length < 3) {
    setError('sterilizedReason', 'Choisissez une raison (ou précisez la vôtre).'); ok = false;
  }
  if (vaccinated === null) { setError('vaccinated', 'Répondez oui ou non.'); ok = false; }
  if (vaccinated === '0' && vaccinatedReason.length < 3) {
    setError('vaccinatedReason', 'Expliquez en quelques mots (3 caractères minimum).'); ok = false;
  }
  if (!ok) return;

  const formData = new FormData();
  formData.append('name', name);
  formData.append('species', document.getElementById('species').value);
  formData.append('breed', document.getElementById('breed').value.trim());
  formData.append('age', document.getElementById('age').value.trim());
  formData.append('gender', document.getElementById('gender').value);
  formData.append('temperament', document.getElementById('temperament').value.trim());
  formData.append('identified', identified);
  if (identified === '0') formData.append('identifiedReason', identifiedReason);
  formData.append('sterilized', sterilized);
  if (sterilized === '0') formData.append('sterilizedReason', sterilizedReason);
  formData.append('vaccinated', vaccinated);
  if (vaccinated === '0') formData.append('vaccinatedReason', vaccinatedReason);
  if (photoFile) formData.append('photo', photoFile);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Création...';
  try {
    const { id } = await api.post('/animals', formData);
    setFeedback('Profil créé ! Bienvenue dans la communauté ! Redirection...', 'success', 'fa-champagne-glasses');
    setTimeout(() => { window.location.href = `/profil-detail.html?id=${id}`; }, 900);
  } catch (err) {
    setFeedback(err.message || 'Erreur lors de la création du profil.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Créer son profil <i class="fa-solid fa-paw" aria-hidden="true"></i>';
  }
});
