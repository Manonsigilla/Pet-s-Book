// Page Pet's Shop — marketplace : grille d'annonces publiées par les membres,
// avec recherche (debounce) et filtres par catégorie.
import '../main.js';
import { api } from '../api.js';
import { escapeHtml, listingCardHtml } from '../shop-view.js';

const state = {
  listings: [],
  category: 'all',
  query: '',
};

const dom = {
  results: document.getElementById('petsshop-results'),
  count: document.getElementById('petsshop-count'),
  search: document.getElementById('search-listing'),
  filters: document.querySelectorAll('.filter-chip'),
};

// -----------------------------------------------------------------------------
// Rendu
// -----------------------------------------------------------------------------

function renderSkeletons(n = 8) {
  dom.results.setAttribute('aria-busy', 'true');
  dom.results.innerHTML = `
    <div class="shop-grid">
      ${Array.from({ length: n }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join('')}
    </div>
  `;
  dom.count.textContent = 'Chargement des annonces...';
}

function renderError(message) {
  dom.results.setAttribute('aria-busy', 'false');
  dom.results.innerHTML = `
    <div class="state state--error" role="alert">
      <h2 class="state__title">Impossible de charger la boutique</h2>
      <p class="state__text">${escapeHtml(message)}</p>
    </div>
  `;
  dom.count.textContent = '';
}

function renderListings(listings) {
  dom.results.setAttribute('aria-busy', 'false');
  dom.count.textContent = `${listings.length} annonce${listings.length > 1 ? 's' : ''}`;

  if (listings.length === 0) {
    dom.results.innerHTML = `
      <div class="state">
        <h2 class="state__title">Aucune annonce</h2>
        <p class="state__text">Soyez le premier à donner une seconde vie aux affaires de vos compagnons !</p>
        <p><a class="btn btn--primary" href="/vendre.html">Vendre un article</a></p>
      </div>
    `;
    return;
  }

  dom.results.innerHTML = `<div class="shop-grid">${listings.map(listingCardHtml).join('')}</div>`;
}

// -----------------------------------------------------------------------------
// Filtrage côté client (les annonces sont déjà chargées)
// -----------------------------------------------------------------------------

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  const filtered = state.listings.filter((l) => {
    if (state.category !== 'all' && l.category !== state.category) return false;
    if (query) {
      const haystack = `${l.title} ${l.brand ?? ''} ${l.description}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  renderListings(filtered);
}

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------

async function init() {
  dom.search.addEventListener('input', debounce((event) => {
    state.query = event.target.value;
    applyFilters();
  }, 200));

  dom.filters.forEach((chip) => {
    chip.addEventListener('click', () => {
      state.category = chip.dataset.category;
      dom.filters.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      applyFilters();
    });
  });

  renderSkeletons();
  try {
    state.listings = await api.get('/listings');
    applyFilters();
  } catch (err) {
    renderError(err.message || 'Erreur réseau, vérifiez que le serveur est démarré.');
  }
}

document.addEventListener('DOMContentLoaded', init);
