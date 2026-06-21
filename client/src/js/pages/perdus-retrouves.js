// Page Perdus/Retrouvés — liste publique + formulaire de soumission (auth requise).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { responsiveImage } from '../animal-view.js';

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
  // Tip
  tipModal: document.getElementById('tip-modal'),
  tipCloseBtn: document.getElementById('close-tip-btn'),
  tipForm: document.getElementById('tip-form'),
  tipSubmitBtn: document.getElementById('tip-submit-btn'),
  tipFeedback: document.getElementById('tip-feedback'),
  tipMessage: document.getElementById('tip-message'),
};

let currentTipId = null;

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
      ${responsiveImage(r.imageUrl || '/placeholder-pet.svg', '', 'lost-card__media')}
      <div class="lost-card__body">
        <span class="lost-card__badge lost-card__badge--${escapeHtml(r.status)}">${escapeHtml(statusLabel(r.status))}</span>
        <h2 class="lost-card__title">${escapeHtml(r.animalName)}</h2>
        <p class="lost-card__meta">
          <span>${escapeHtml(r.species)}</span>
          <span>Le ${escapeHtml(r.lostDate)}</span>
          <span>${escapeHtml(r.location)}</span>
        </p>
        <p>${escapeHtml(r.description)}</p>
        <div class="lost-card__footer">
          <button class="btn btn--ghost lost-card__tip-btn" data-id="${r.id}" data-tips="${r.tipsCount || 0}">
            <i class="fa-solid fa-eye" aria-hidden="true"></i> J'ai des informations (${r.tipsCount || 0})
          </button>
          <p class="lost-card__contact"><strong>Contact :</strong> ${escapeHtml(r.contact)}</p>
        </div>
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
  if (event.key === 'Escape' && dom.tipModal.getAttribute('data-open') === 'true') {
    closeTipModal();
  }
});

// -----------------------------------------------------------------------------
// Modal « J'ai des informations »
// -----------------------------------------------------------------------------

function openTipModal(id, _tipsCount) {
  if (!auth.isAuthenticated()) {
    window.location.href = `/login.html?redirect=${encodeURIComponent('/perdus-retrouves.html')}`;
    return;
  }
  currentTipId = id;
  dom.tipForm.reset();
  dom.tipFeedback.textContent = '';
  dom.tipFeedback.className = 'auth-feedback';
  dom.tipModal.setAttribute('data-open', 'true');
  dom.tipModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  dom.tipMessage.focus();
}

function closeTipModal() {
  dom.tipModal.setAttribute('data-open', 'false');
  dom.tipModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  currentTipId = null;
  dom.tipFeedback.textContent = '';
  dom.tipFeedback.className = 'auth-feedback';
}

dom.tipCloseBtn.addEventListener('click', closeTipModal);
dom.tipModal.addEventListener('click', (event) => {
  if (event.target === dom.tipModal) closeTipModal();
});

// Délégation : boutons tip sur les cartes
dom.results.addEventListener('click', (event) => {
  const btn = event.target.closest('.lost-card__tip-btn');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const tips = Number(btn.dataset.tips);
  if (id) openTipModal(id, tips);
});

// Soumission du tip
dom.tipForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  dom.tipFeedback.textContent = '';
  dom.tipSubmitBtn.disabled = true;

  try {
    const message = dom.tipMessage.value.trim();
    const data = await api.post(`/lost/${currentTipId}/tip`, { message });
    // Met à jour le compteur sur la carte
    const btn = document.querySelector(`.lost-card__tip-btn[data-id="${currentTipId}"]`);
    if (btn) {
      btn.dataset.tips = data.tipsCount;
      btn.textContent = ` J'ai des informations (${data.tipsCount})`;
    }
    dom.tipFeedback.textContent = message
      ? 'Merci ! Votre message a été transmis.'
      : 'Merci ! Votre signalement a été comptabilisé.';
    dom.tipFeedback.className = 'auth-feedback auth-feedback--success';
    setTimeout(closeTipModal, 2000);
  } catch (err) {
    dom.tipFeedback.textContent = err.message || 'Erreur lors de l\'envoi.';
    dom.tipFeedback.className = 'auth-feedback auth-feedback--error';
  } finally {
    dom.tipSubmitBtn.disabled = false;
  }
});

// -----------------------------------------------------------------------------
// Soumission du formulaire (avec photo)
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

function validateReport(values, file) {
  let ok = true;
  if (!values.get('animalName') || values.get('animalName').trim().length < 1) {
    setFieldError('animalName', 'Le nom est requis.');
    ok = false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.get('lostDate'))) {
    setFieldError('lostDate', 'Date invalide.');
    ok = false;
  }
  if (!values.get('location') || values.get('location').trim().length < 2) {
    setFieldError('location', 'Précisez un lieu.');
    ok = false;
  }
  if (!values.get('description') || values.get('description').trim().length < 10) {
    setFieldError('description', 'Au moins 10 caractères.');
    ok = false;
  }
  if (!values.get('contact') || values.get('contact').trim().length < 3) {
    setFieldError('contact', 'Contact requis.');
    ok = false;
  }
  // Validation du fichier (optionnel)
  if (file && file.size > 0) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) {
      setFieldError('photo', 'Format non supporté (JPEG, PNG, WebP ou AVIF).');
      ok = false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldError('photo', 'La photo ne doit pas dépasser 5 Mo.');
      ok = false;
    }
  }
  return ok;
}

dom.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFormErrors();
  dom.feedback.textContent = '';

  const formData = new FormData(dom.form);
  const file = document.getElementById('photo').files[0];

  if (!validateReport(formData, file)) return;

  dom.submitBtn.disabled = true;
  const originalLabel = dom.submitBtn.textContent;
  dom.submitBtn.textContent = 'Envoi...';

  try {
    await api.post('/lost', formData);
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
