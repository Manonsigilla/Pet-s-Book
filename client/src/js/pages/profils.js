// Page Profils — annuaire COMPLET des animaux, réservé à l'administrateur.
// Les membres sont redirigés vers leur espace Copains (les profils sont privés
// et se découvrent par amitié), les visiteurs vers la connexion.
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { escapeHtml, speciesLine, describe, tagsHtml } from '../animal-view.js';

if (!auth.isAuthenticated()) {
  window.location.replace(`/login.html?redirect=${encodeURIComponent('/profils.html')}`);
} else if (!auth.isAdmin()) {
  window.location.replace('/copains.html');
}

// Pour la grille RNCP : démonstration de fetch async, manipulation DOM,
// évènements (input, click) et timers (debounce).

const ESPECES_CONNUES = new Set(['chat', 'chien', 'lapin', 'oiseau']);

const state = {
  animals: [],
  species: 'all',
  query: '',
};

const dom = {
  results: document.getElementById('profils-results'),
  count: document.getElementById('profils-count'),
  search: document.getElementById('search-animal'),
  filters: document.querySelectorAll('.filter-chip'),
};

// -----------------------------------------------------------------------------
// Rendu
// -----------------------------------------------------------------------------

function renderSkeletons(n = 6) {
  dom.results.setAttribute('aria-busy', 'true');
  dom.results.innerHTML = `
    <div class="grid-cards">
      ${Array.from({ length: n }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join('')}
    </div>
  `;
  dom.count.textContent = 'Chargement des profils...';
}

function renderError(message) {
  dom.results.setAttribute('aria-busy', 'false');
  dom.results.innerHTML = `
    <div class="state state--error" role="alert">
      <h2 class="state__title">Impossible de charger les profils</h2>
      <p class="state__text">${escapeHtml(message)}</p>
    </div>
  `;
  dom.count.textContent = '';
}

function renderEmpty() {
  dom.results.setAttribute('aria-busy', 'false');
  dom.results.innerHTML = `
    <div class="state">
      <h2 class="state__title">Aucun résultat</h2>
      <p class="state__text">Essayez d'élargir votre recherche ou de retirer un filtre.</p>
    </div>
  `;
}

function renderAnimals(animals) {
  dom.results.setAttribute('aria-busy', 'false');

  if (animals.length === 0) {
    renderEmpty();
    return;
  }

  const cards = animals.map((animal) => {
    const desc = describe(animal);
    const meta = [speciesLine(animal), animal.age].filter(Boolean).join(' · ');
    return `
    <article class="card">
      <img
        class="card__media"
        src="${escapeHtml(animal.imageUrl || '/placeholder-pet.svg')}"
        alt="Photo de ${escapeHtml(animal.name)}"
        loading="lazy"
      />
      <div class="card__body">
        ${tagsHtml(animal)}
        <h2 class="card__title">${escapeHtml(animal.name)}</h2>
        <p class="card__meta">${escapeHtml(meta)}</p>
        ${desc ? `<p class="card__text">${escapeHtml(desc)}</p>` : ''}
        ${animal.ownerName ? `<p class="card__meta">Chez ${escapeHtml(animal.ownerName)}</p>` : ''}
        <div class="card__footer">
          <a class="btn btn--ghost" href="/profil-detail.html?id=${animal.id}">Voir le profil</a>
        </div>
      </div>
    </article>
  `;
  }).join('');

  dom.results.innerHTML = `<div class="grid-cards">${cards}</div>`;
}

// -----------------------------------------------------------------------------
// Logique de filtrage
// -----------------------------------------------------------------------------

function applyFilters() {
  const query = state.query.trim().toLowerCase();

  const filtered = state.animals.filter((animal) => {
    // Filtre par espèce
    if (state.species === 'autre' && ESPECES_CONNUES.has(animal.species)) return false;
    if (state.species !== 'all' && state.species !== 'autre' && animal.species !== state.species) return false;

    // Filtre par texte (nom, race, caractère, localisation)
    if (query) {
      const haystack = `${animal.name} ${animal.breed ?? ''} ${animal.breedSecondary ?? ''} ${animal.temperament ?? ''} ${animal.physicalDesc ?? ''} ${animal.location ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  dom.count.textContent = `${filtered.length} profil${filtered.length > 1 ? 's' : ''} affiché${filtered.length > 1 ? 's' : ''}`;
  renderAnimals(filtered);
}

// -----------------------------------------------------------------------------
// Utilitaires
// -----------------------------------------------------------------------------

// escapeHtml et helpers de présentation : voir ../animal-view.js

// Debounce — exigence implicite de la grille : utilisation de timers
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
  // Branchements UI
  dom.search.addEventListener('input', debounce((event) => {
    state.query = event.target.value;
    applyFilters();
  }, 200));

  dom.filters.forEach((chip) => {
    chip.addEventListener('click', () => {
      state.species = chip.dataset.species;
      dom.filters.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      applyFilters();
    });
  });

  // Chargement initial
  renderSkeletons();
  try {
    state.animals = await api.get('/animals');
    applyFilters();
  } catch (err) {
    renderError(err.message || 'Erreur réseau, vérifiez que le serveur est démarré.');
  }
}

document.addEventListener('DOMContentLoaded', init);
