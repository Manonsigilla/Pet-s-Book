// Page Événements — agenda chargé depuis l'API /events, avec filtre à venir/passés.
import '../main.js';
import { api } from '../api.js';

const state = {
  events: [],
  when: 'upcoming', // upcoming | past | all
};

const dom = {
  results: document.getElementById('evenements-results'),
  count: document.getElementById('evenements-count'),
  filters: document.querySelectorAll('.filter-chip'),
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

// "2026-06-15 10:00:00" → Date (on normalise l'espace en T pour la compatibilité).
function toDate(startsAt) {
  return new Date(String(startsAt).replace(' ', 'T'));
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' });
const timeFmt = new Intl.DateTimeFormat('fr-BE', { hour: '2-digit', minute: '2-digit' });

function formatDateTime(startsAt) {
  const d = toDate(startsAt);
  if (Number.isNaN(d.getTime())) return escapeHtml(startsAt);
  return `${dateFmt.format(d)} — ${timeFmt.format(d).replace(':', 'h')}`;
}

// -----------------------------------------------------------------------------
// Rendu
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
  dom.results.innerHTML = `
    <div class="state">
      <h2 class="state__title">Aucun événement</h2>
      <p class="state__text">Aucun événement ne correspond à ce filtre pour le moment.</p>
    </div>
  `;
}

function renderEvents(events) {
  dom.results.setAttribute('aria-busy', 'false');

  if (events.length === 0) {
    renderEmpty();
    return;
  }

  const now = Date.now();
  const cards = events.map((ev) => {
    const isPast = toDate(ev.startsAt).getTime() < now;
    return `
    <article class="event-card${isPast ? ' event-card--past' : ''}">
      <img
        class="event-card__media"
        src="${escapeHtml(ev.imageUrl || '/placeholder-pet.svg')}"
        alt="Illustration de l'événement ${escapeHtml(ev.title)}"
        loading="lazy"
      />
      <div class="event-card__body">
        ${isPast ? '<span class="event-card__badge">Terminé</span>' : ''}
        <h2 class="event-card__title">${escapeHtml(ev.title)}</h2>
        <p class="event-card__meta">
          <time datetime="${escapeHtml(ev.startsAt)}">${formatDateTime(ev.startsAt)}</time>
          <span>${escapeHtml(ev.location)}</span>
        </p>
        <p class="event-card__text">${escapeHtml(ev.description)}</p>
      </div>
    </article>
  `;
  }).join('');

  dom.results.innerHTML = `<div class="evenements__list">${cards}</div>`;
}

// -----------------------------------------------------------------------------
// Filtrage
// -----------------------------------------------------------------------------

function applyFilter() {
  const now = Date.now();
  const filtered = state.events.filter((ev) => {
    if (state.when === 'all') return true;
    const isPast = toDate(ev.startsAt).getTime() < now;
    return state.when === 'past' ? isPast : !isPast;
  });

  // À venir : du plus proche au plus lointain. Passés : du plus récent au plus ancien.
  filtered.sort((a, b) => {
    const diff = toDate(a.startsAt) - toDate(b.startsAt);
    return state.when === 'past' ? -diff : diff;
  });

  dom.count.textContent = `${filtered.length} événement${filtered.length > 1 ? 's' : ''}`;
  renderEvents(filtered);
}

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------

function initFilters() {
  dom.filters.forEach((chip) => {
    chip.addEventListener('click', () => {
      state.when = chip.dataset.when;
      dom.filters.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      applyFilter();
    });
  });
}

async function init() {
  initFilters();
  renderSkeletons();
  try {
    state.events = await api.get('/events');
    applyFilter();
  } catch (err) {
    renderError(err.message || 'Erreur réseau, vérifiez que le serveur est démarré.');
  }
}

document.addEventListener('DOMContentLoaded', init);
