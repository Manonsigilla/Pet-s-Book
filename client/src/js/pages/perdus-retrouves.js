// Page Perdus/Retrouvés — liste publique + formulaire de soumission (auth requise).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';

const state = {
  reports: [],
  status: 'all',
};

const dom = {
  results: document.getElementById('lost-results'),
  count: document.getElementById('lost-count'),
  filters: document.querySelectorAll('.filter-chip'),
  openBtn: document.getElementById('open-form-btn'),
  modal: document.getElementById('report-modal'),
  closeBtn: document.getElementById('close-modal-btn'),
  form: document.getElementById('report-form'),
  submitBtn: document.getElementById('report-submit-btn'),
  feedback: document.getElementById('form-feedback'),
};

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusLabel(status) {
  return status === 'lost' ? 'Perdu' : status === 'found' ? 'Trouvé' : 'Clos';
}

// -----------------------------------------------------------------------------
// Rendu de la liste
// -----------------------------------------------------------------------------

function renderEmpty() {
  dom.results.innerHTML = `
    <div class="state">
      <h2 class="state__title">Aucune annonce</h2>
      <p class="state__text">Aucune annonce ne correspond à votre filtre pour le moment.</p>
    </div>
  `;
}

function renderError(message) {
  dom.results.innerHTML = `
    <div class="state state--error" role="alert">
      <h2 class="state__title">Erreur de chargement</h2>
      <p class="state__text">${escapeHtml(message)}</p>
    </div>
  `;
}

function applyFilters() {
  const filtered = state.reports.filter((r) => {
    if (state.status === 'all') return true;
    return r.status === state.status;
  });

  dom.count.textContent = `${filtered.length} annonce${filtered.length > 1 ? 's' : ''} affichée${filtered.length > 1 ? 's' : ''}`;
  dom.results.setAttribute('aria-busy', 'false');

  if (filtered.length === 0) {
    renderEmpty();
    return;
  }

  const cards = filtered.map((r) => `
    <article class="lost-card">
      <img class="lost-card__media" src="${escapeHtml(r.imageUrl || '/placeholder-pet.svg')}" alt="" loading="lazy" />
      <div class="lost-card__body">
        <span class="lost-card__badge lost-card__badge--${escapeHtml(r.status)}">${escapeHtml(statusLabel(r.status))}</span>
        <h2 class="lost-card__title">${escapeHtml(r.animalName)}</h2>
        <p class="lost-card__meta">
          <span>${escapeHtml(r.species)}</span>
          <span>Le ${escapeHtml(r.lostDate)}</span>
          <span>${escapeHtml(r.location)}</span>
        </p>
        <p>${escapeHtml(r.description)}</p>
        <p class="lost-card__contact"><strong>Contact :</strong> ${escapeHtml(r.contact)}</p>
      </div>
    </article>
  `).join('');

  dom.results.innerHTML = `<div class="lost-grid">${cards}</div>`;
}

// -----------------------------------------------------------------------------
// Filtres
// -----------------------------------------------------------------------------

dom.filters.forEach((chip) => {
  chip.addEventListener('click', () => {
    state.status = chip.dataset.status;
    dom.filters.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    applyFilters();
  });
});

// -----------------------------------------------------------------------------
// Modal — ouverture / fermeture
// -----------------------------------------------------------------------------

function openModal() {
  // Si non connecté, redirige vers /login avec retour ici après
  if (!auth.isAuthenticated()) {
    window.location.href = `/login.html?redirect=${encodeURIComponent('/perdus-retrouves.html')}`;
    return;
  }
  dom.modal.setAttribute('data-open', 'true');
  dom.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // Met le focus sur le premier champ pour l'accessibilité clavier
  dom.form.querySelector('input, select, textarea')?.focus();
}

function closeModal() {
  dom.modal.setAttribute('data-open', 'false');
  dom.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  dom.feedback.textContent = '';
  dom.feedback.className = 'auth-feedback';
}

dom.openBtn.addEventListener('click', openModal);
dom.closeBtn.addEventListener('click', closeModal);
dom.modal.addEventListener('click', (event) => {
  if (event.target === dom.modal) closeModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && dom.modal.getAttribute('data-open') === 'true') {
    closeModal();
  }
});

// -----------------------------------------------------------------------------
// Soumission du formulaire
// -----------------------------------------------------------------------------

function clearFormErrors() {
  document.querySelectorAll('.form__error').forEach((el) => { el.textContent = ''; });
  dom.form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}

function setFieldError(fieldId, message) {
  const error = document.getElementById(`${fieldId}-error`);
  const input = document.getElementById(fieldId);
  if (error) error.textContent = message;
  if (input) input.setAttribute('aria-invalid', 'true');
}

function validateReport(values) {
  let ok = true;
  if (values.animalName.length < 1) {
    setFieldError('animalName', 'Le nom est requis.');
    ok = false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.lostDate)) {
    setFieldError('lostDate', 'Date invalide.');
    ok = false;
  }
  if (values.location.length < 2) {
    setFieldError('location', 'Précisez un lieu.');
    ok = false;
  }
  if (values.description.length < 10) {
    setFieldError('description', 'Au moins 10 caractères.');
    ok = false;
  }
  if (values.contact.length < 3) {
    setFieldError('contact', 'Contact requis.');
    ok = false;
  }
  return ok;
}

dom.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFormErrors();
  dom.feedback.textContent = '';

  const values = {
    status: document.getElementById('status').value,
    animalName: document.getElementById('animalName').value.trim(),
    species: document.getElementById('species').value,
    lostDate: document.getElementById('lostDate').value,
    location: document.getElementById('location').value.trim(),
    description: document.getElementById('description').value.trim(),
    contact: document.getElementById('contact').value.trim(),
  };

  if (!validateReport(values)) return;

  dom.submitBtn.disabled = true;
  const originalLabel = dom.submitBtn.textContent;
  dom.submitBtn.textContent = 'Envoi...';

  try {
    await api.post('/lost', values);
    dom.feedback.textContent = 'Annonce envoyée ! Elle sera publiée après validation par un administrateur.';
    dom.feedback.className = 'auth-feedback auth-feedback--success';
    dom.form.reset();
    setTimeout(closeModal, 2500);
  } catch (err) {
    dom.feedback.textContent = err.message || 'Erreur lors de l\'envoi.';
    dom.feedback.className = 'auth-feedback auth-feedback--error';
    dom.submitBtn.disabled = false;
    dom.submitBtn.textContent = originalLabel;
    return;
  }

  dom.submitBtn.disabled = false;
  dom.submitBtn.textContent = originalLabel;
});

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------

async function loadReports() {
  dom.results.setAttribute('aria-busy', 'true');
  try {
    state.reports = await api.get('/lost');
    applyFilters();
  } catch (err) {
    renderError(err.message);
  }
}

loadReports();
