// Page Évènements — agenda chargé depuis l'API /events. Les cartes sont
// cliquables (modale de détail) ; un membre connecté peut s'inscrire / se
// désinscrire, filtrer sur « Mes évènements », et — sur un évènement passé
// auquel il était inscrit — laisser un avis (note 1–5 + commentaire facultatif).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { responsiveImage } from '../animal-view.js';

const state = {
  events: [],
  when: 'upcoming', // upcoming | past | all | mine
  user: auth.getUser(),
};

const dom = {
  results: document.getElementById('evenements-results'),
  count: document.getElementById('evenements-count'),
  filterMine: document.getElementById('filter-mine'),
  modal: document.getElementById('event-modal'),
  modalContent: document.getElementById('event-modal-content'),
};

let lastFocused = null; // élément à re-focuser à la fermeture de la modale

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// "2026-06-15 10:00:00" → Date (on normalise l'espace en T pour la compatibilité).
function toDate(startsAt) {
  return new Date(String(startsAt).replace(' ', 'T'));
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' });
const timeFmt = new Intl.DateTimeFormat('fr-BE', { hour: '2-digit', minute: '2-digit' });
const dateShortFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium' });

function formatDateTime(startsAt) {
  const d = toDate(startsAt);
  if (Number.isNaN(d.getTime())) return escapeHtml(startsAt);
  return `${dateFmt.format(d)} — ${timeFmt.format(d).replace(':', 'h')}`;
}

function formatDate(value) {
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? escapeHtml(value) : dateShortFmt.format(d);
}

function isPast(ev) {
  return toDate(ev.startsAt).getTime() < Date.now();
}

function attendeesLabel(n) {
  const count = Number(n) || 0;
  return `${count} inscrit${count > 1 ? 's' : ''}`;
}

// 5 étoiles d'affichage (pleines jusqu'à la note arrondie).
function starsDisplay(rating) {
  const r = Math.round(Number(rating) || 0);
  let icons = '';
  for (let i = 1; i <= 5; i += 1) {
    icons += `<i class="fa-${i <= r ? 'solid' : 'regular'} fa-star" aria-hidden="true"></i>`;
  }
  return `<span class="stars" role="img" aria-label="Note : ${r} sur 5">${icons}</span>`;
}

function eventById(id) {
  return state.events.find((e) => e.id === id);
}

// -----------------------------------------------------------------------------
// Rendu de la liste
// -----------------------------------------------------------------------------

function renderSkeletons(n = 4) {
  dom.results.setAttribute('aria-busy', 'true');
  dom.results.innerHTML = `
    <div class="evenements__list">
      ${Array.from({ length: n }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join('')}
    </div>
  `;
  dom.count.textContent = 'Chargement de l\'agenda...';
}

function renderError(message) {
  dom.results.setAttribute('aria-busy', 'false');
  dom.results.innerHTML = `
    <div class="state state--error" role="alert">
      <h2 class="state__title">Impossible de charger l'agenda</h2>
      <p class="state__text">${escapeHtml(message)}</p>
    </div>
  `;
  dom.count.textContent = '';
}

function renderEmpty() {
  dom.results.setAttribute('aria-busy', 'false');
  const text = state.when === 'mine'
    ? 'Vous n\'êtes inscrit·e à aucun évènement pour le moment.'
    : 'Aucun évènement ne correspond à ce filtre pour le moment.';
  dom.results.innerHTML = `
    <div class="state">
      <h2 class="state__title">Aucun évènement</h2>
      <p class="state__text">${text}</p>
    </div>
  `;
}

function eventCardHtml(ev) {
  const past = isPast(ev);
  const badges = [
    past ? '<span class="event-card__badge">Terminé</span>' : '',
    ev.isRegistered ? '<span class="event-card__badge event-card__badge--registered"><i class="fa-solid fa-check" aria-hidden="true"></i> Inscrit·e</span>' : '',
  ].join('');
  const rating = ev.reviewCount > 0
    ? `<p class="event-card__rating">${starsDisplay(ev.avgRating)} <span>${ev.avgRating}/5 · ${ev.reviewCount} avis</span></p>`
    : '';
  return `
    <article class="event-card event-card--clickable${past ? ' event-card--past' : ''}"
      data-id="${ev.id}" role="button" tabindex="0"
      aria-label="Voir le détail de l'évènement ${escapeHtml(ev.title)}">
      ${responsiveImage(ev.imageUrl || '/placeholder-pet.svg', '', 'event-card__media')}
      <div class="event-card__body">
        ${badges}
        <h2 class="event-card__title">${escapeHtml(ev.title)}</h2>
        <p class="event-card__meta">
          <time datetime="${escapeHtml(ev.startsAt)}">${formatDateTime(ev.startsAt)}</time>
          <span>${escapeHtml(ev.location)}</span>
        </p>
        <p class="event-card__text">${escapeHtml(ev.description)}</p>
        <p class="event-card__attendees">
          <i class="fa-solid fa-user-group" aria-hidden="true"></i> ${attendeesLabel(ev.attendeeCount)}
        </p>
        ${rating}
      </div>
    </article>
  `;
}

function renderEvents(events) {
  dom.results.setAttribute('aria-busy', 'false');
  if (events.length === 0) {
    renderEmpty();
    return;
  }
  dom.results.innerHTML = `<div class="evenements__list">${events.map(eventCardHtml).join('')}</div>`;
}

// -----------------------------------------------------------------------------
// Filtrage
// -----------------------------------------------------------------------------

function applyFilter() {
  const now = Date.now();
  const filtered = state.events.filter((ev) => {
    if (state.when === 'mine') return Boolean(ev.isRegistered);
    if (state.when === 'all') return true;
    const past = toDate(ev.startsAt).getTime() < now;
    return state.when === 'past' ? past : !past;
  });

  // À venir / Mes évènements : du plus proche au plus lointain.
  // Passés : du plus récent au plus ancien.
  filtered.sort((a, b) => {
    const diff = toDate(a.startsAt) - toDate(b.startsAt);
    return state.when === 'past' ? -diff : diff;
  });

  const noun = `évènement${filtered.length > 1 ? 's' : ''}`;
  dom.count.textContent = state.when === 'mine'
    ? `${filtered.length} ${noun} — vous êtes inscrit·e`
    : `${filtered.length} ${noun}`;
  renderEvents(filtered);
}

// -----------------------------------------------------------------------------
// Modale de détail + inscription
// -----------------------------------------------------------------------------

function registerControlHtml(ev) {
  if (!state.user) {
    return '<a class="btn btn--primary btn--block" href="./login.html">Connectez-vous pour vous inscrire</a>';
  }
  if (isPast(ev)) {
    return '<p class="event-modal__note">Cet évènement est terminé, les inscriptions sont closes.</p>';
  }
  return ev.isRegistered
    ? `<button class="btn btn--secondary btn--block" type="button" data-register="off" data-id="${ev.id}">Se désinscrire</button>`
    : `<button class="btn btn--primary btn--block" type="button" data-register="on" data-id="${ev.id}">S'inscrire</button>`;
}

function renderModalContent(ev) {
  const registered = ev.isRegistered
    ? ' · <strong class="event-modal__registered">Vous êtes inscrit·e</strong>'
    : '';
  // La section avis n'apparaît que pour un évènement passé (chargée ensuite).
  const reviews = isPast(ev)
    ? '<section class="event-reviews" id="event-reviews" aria-label="Avis sur l\'évènement"><p class="event-reviews__loading">Chargement des avis…</p></section>'
    : '';
  dom.modalContent.innerHTML = `
    ${responsiveImage(ev.imageUrl || '/placeholder-pet.svg', '', 'event-modal__media', '', false)}
    <h2 class="event-modal__title" id="event-modal-title">${escapeHtml(ev.title)}</h2>
    <p class="event-modal__meta">
      <time datetime="${escapeHtml(ev.startsAt)}">${formatDateTime(ev.startsAt)}</time>
      <span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${escapeHtml(ev.location)}</span>
    </p>
    <p class="event-modal__attendees">
      <i class="fa-solid fa-user-group" aria-hidden="true"></i> ${attendeesLabel(ev.attendeeCount)}${registered}
    </p>
    <p class="event-modal__text">${escapeHtml(ev.description)}</p>
    <div class="event-modal__actions">${registerControlHtml(ev)}</div>
    ${reviews}
  `;
}

function openModal(id) {
  const ev = eventById(id);
  if (!ev) return;
  lastFocused = document.activeElement;
  renderModalContent(ev);
  dom.modal.hidden = false;
  document.body.style.overflow = 'hidden';
  dom.modal.querySelector('.event-modal__close')?.focus();
  if (isPast(ev)) loadReviews(ev);
}

function closeModal() {
  if (dom.modal.hidden) return;
  dom.modal.hidden = true;
  document.body.style.overflow = '';
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

async function toggleRegister(id, on) {
  const ev = eventById(id);
  if (!ev) return;
  const btn = dom.modalContent.querySelector('[data-register]');
  if (btn) btn.disabled = true;
  try {
    const res = on
      ? await api.post(`/events/${id}/register`)
      : await api.delete(`/events/${id}/register`);
    ev.isRegistered = res.isRegistered;
    ev.attendeeCount = res.attendeeCount;
    renderModalContent(ev);
    applyFilter(); // la carte sous-jacente et le filtre « Mes évènements » se mettent à jour
  } catch (err) {
    renderModalContent(ev); // restaure le bouton actif
    const actions = dom.modalContent.querySelector('.event-modal__actions');
    if (actions) {
      actions.insertAdjacentHTML(
        'beforeend',
        `<p class="event-modal__error" role="alert">${escapeHtml(err.message || 'Action impossible pour le moment.')}</p>`,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Avis (évènements passés)
// -----------------------------------------------------------------------------

function reviewFormHtml(ev, myReview) {
  if (!state.user) {
    return '<a class="btn btn--secondary" href="./login.html">Connectez-vous pour laisser un avis</a>';
  }
  if (!ev.isRegistered) {
    return '<p class="event-reviews__note">Seuls les participants inscrits peuvent laisser un avis.</p>';
  }
  // Étoiles en ordre décroissant (5→1) : l'astuce CSS « row-reverse + ~ » les
  // affiche 1→5 et remplit au survol / à la sélection.
  const stars = [5, 4, 3, 2, 1].map((n) => `
    <input type="radio" name="event-rating" id="star-${n}" value="${n}" ${myReview && myReview.rating === n ? 'checked' : ''} />
    <label for="star-${n}" title="${n} étoile${n > 1 ? 's' : ''}">
      <span class="visually-hidden">${n} étoile${n > 1 ? 's' : ''}</span>
      <i class="fa-solid fa-star" aria-hidden="true"></i>
    </label>
  `).join('');
  return `
    <form class="review-form" data-review-form data-id="${ev.id}">
      <fieldset class="review-form__stars">
        <legend>Votre note</legend>
        <div class="star-input">${stars}</div>
      </fieldset>
      <label class="review-form__label" for="review-comment">Votre avis (facultatif)</label>
      <textarea class="review-form__comment" id="review-comment" name="comment" rows="3"
        maxlength="2000" placeholder="Partagez votre expérience…">${escapeHtml(myReview?.comment || '')}</textarea>
      <p class="event-reviews__warning" data-review-warning hidden role="alert"></p>
      <div class="review-form__actions">
        <button type="submit" class="btn btn--primary">${myReview ? 'Mettre à jour mon avis' : 'Publier mon avis'}</button>
        ${myReview ? '<button type="button" class="btn btn--ghost" data-review-delete>Supprimer</button>' : ''}
      </div>
    </form>
  `;
}

function renderReviews(ev, data) {
  const host = document.getElementById('event-reviews');
  if (!host) return;

  const summary = data.reviewCount > 0
    ? `<div class="event-reviews__summary">${starsDisplay(data.avgRating)} <strong>${data.avgRating}</strong>/5 · ${data.reviewCount} avis</div>`
    : '<p class="event-reviews__empty">Aucun avis pour le moment.</p>';

  // Seuls les avis avec un commentaire écrit sont listés (les notes seules
  // comptent dans la moyenne mais n'ont rien à afficher).
  const written = data.reviews.filter((rv) => rv.comment);
  const list = written.map((rv) => `
    <li class="event-review">
      <div class="event-review__head">
        ${starsDisplay(rv.rating)}
        <span class="event-review__author">${escapeHtml(rv.reviewerName)}</span>
        <time datetime="${escapeHtml(rv.createdAt)}">${formatDate(rv.createdAt)}</time>
      </div>
      <p class="event-review__comment">${escapeHtml(rv.comment)}</p>
    </li>
  `).join('');

  host.innerHTML = `
    <h3 class="event-reviews__title">Avis</h3>
    ${summary}
    ${list ? `<ul class="event-reviews__list">${list}</ul>` : ''}
    <div class="event-reviews__form">${reviewFormHtml(ev, data.myReview)}</div>
  `;
}

async function loadReviews(ev) {
  const host = document.getElementById('event-reviews');
  if (!host) return;
  try {
    const data = await api.get(`/events/${ev.id}/reviews`);
    ev.avgRating = data.avgRating;
    ev.reviewCount = data.reviewCount;
    ev.myReview = data.myReview;
    renderReviews(ev, data);
    applyFilter(); // rafraîchit la note moyenne sur la carte sous-jacente
  } catch (err) {
    host.innerHTML = `<p class="event-reviews__loading">${escapeHtml(err.message || 'Impossible de charger les avis.')}</p>`;
  }
}

async function submitReview(form) {
  const id = Number(form.dataset.id);
  const ev = eventById(id);
  if (!ev) return;

  const checked = form.querySelector('input[name="event-rating"]:checked');
  const rating = checked ? Number(checked.value) : 0;
  const comment = form.querySelector('[name="comment"]').value;
  const warning = form.querySelector('[data-review-warning]');

  // Note obligatoire : sans étoiles, on avertit et on n'envoie rien.
  if (rating === 0) {
    if (warning) {
      warning.textContent = 'Cochez le nombre d\'étoiles que vous souhaitez attribuer';
      warning.hidden = false;
    }
    return;
  }
  if (warning) warning.hidden = true;

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  try {
    await api.post(`/events/${id}/reviews`, { rating, comment });
    await loadReviews(ev); // recharge la liste, ma synthèse et la carte
  } catch (err) {
    if (submitBtn) submitBtn.disabled = false;
    if (warning) {
      warning.textContent = err.message || 'Impossible d\'enregistrer votre avis.';
      warning.hidden = false;
    }
  }
}

async function deleteReview(id) {
  const ev = eventById(id);
  if (!ev) return;
  try {
    await api.delete(`/events/${id}/reviews`);
    await loadReviews(ev);
  } catch (err) {
    const warning = document.querySelector('[data-review-warning]');
    if (warning) {
      warning.textContent = err.message || 'Suppression impossible.';
      warning.hidden = false;
    }
  }
}

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------

function initFilters() {
  // Le filtre « Mes évènements » n'a de sens que pour un membre connecté.
  if (state.user && dom.filterMine) dom.filterMine.hidden = false;

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.when = chip.dataset.when;
      document.querySelectorAll('.filter-chip').forEach((c) => {
        c.setAttribute('aria-pressed', String(c === chip));
      });
      applyFilter();
    });
  });
}

function initInteractions() {
  // Ouverture de la modale au clic ou au clavier (carte = role="button").
  dom.results.addEventListener('click', (e) => {
    const card = e.target.closest('.event-card[data-id]');
    if (card) openModal(Number(card.dataset.id));
  });
  dom.results.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.event-card[data-id]');
    if (card) {
      e.preventDefault();
      openModal(Number(card.dataset.id));
    }
  });

  // Clics dans la modale : fermeture, inscription, suppression d'avis.
  dom.modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      closeModal();
      return;
    }
    const reg = e.target.closest('[data-register]');
    if (reg) {
      toggleRegister(Number(reg.dataset.id), reg.dataset.register === 'on');
      return;
    }
    const del = e.target.closest('[data-review-delete]');
    if (del) {
      const form = del.closest('[data-review-form]');
      if (form) deleteReview(Number(form.dataset.id));
    }
  });
  // Soumission du formulaire d'avis.
  dom.modal.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-review-form]');
    if (form) {
      e.preventDefault();
      submitReview(form);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

async function init() {
  initFilters();
  initInteractions();
  renderSkeletons();
  try {
    state.events = await api.get('/events');
    applyFilter();
  } catch (err) {
    renderError(err.message || 'Erreur réseau, vérifiez que le serveur est démarré.');
  }
}

document.addEventListener('DOMContentLoaded', init);
