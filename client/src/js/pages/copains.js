// Page Copains & copines — demandes reçues, suggestions et liste des copains.
// Le membre agit au nom de l'un de ses animaux (sélecteur si plusieurs).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { escapeHtml, capitalize, copainLabel, copainWord } from '../animal-view.js';

if (!auth.isAuthenticated()) {
  window.location.replace(`/login.html?redirect=${encodeURIComponent('/copains.html')}`);
}

const dom = {
  actingWrap: document.getElementById('acting-as'),
  actingSelect: document.getElementById('acting-select'),
  requests: document.getElementById('requests-list'),
  requestsCount: document.getElementById('requests-count'),
  suggestions: document.getElementById('suggestions-list'),
  friends: document.getElementById('friends-list'),
  friendsCount: document.getElementById('friends-count'),
};

let myAnimals = [];

const errorState = (message) => `
  <div class="state state--error" role="alert"><p class="state__text">${escapeHtml(message)}</p></div>
`;

function actingAnimalId() {
  return Number(dom.actingSelect.value || myAnimals[0]?.id);
}

// -----------------------------------------------------------------------------
// Mes animaux (au nom de qui on agit)
// -----------------------------------------------------------------------------

async function loadMyAnimals() {
  myAnimals = await api.get('/animals/mine');
  if (myAnimals.length > 1) {
    dom.actingSelect.innerHTML = myAnimals
      .map((a) => `<option value="${a.id}">${escapeHtml(a.name)} (${escapeHtml(a.species)})</option>`)
      .join('');
    dom.actingWrap.hidden = false;
  }
}

// -----------------------------------------------------------------------------
// Demandes reçues
// -----------------------------------------------------------------------------

function miniCard(animal, extraHtml = '') {
  return `
    <div class="copain-card">
      <img class="copain-card__media" src="${escapeHtml(animal.imageUrl || '/placeholder-pet.svg')}" alt="" loading="lazy" />
      <div class="copain-card__body">
        <p class="copain-card__name">${escapeHtml(animal.name)}</p>
        <p class="copain-card__meta">
          ${escapeHtml(capitalize(animal.species))}${animal.breed ? ` · ${escapeHtml(animal.breed)}` : ''}${animal.age ? ` · ${escapeHtml(animal.age)}` : ''}
        </p>
        ${animal.ownerName ? `<p class="copain-card__meta">Chez ${escapeHtml(animal.ownerName)}</p>` : ''}
        ${extraHtml}
      </div>
    </div>
  `;
}

async function loadRequests() {
  try {
    const { received } = await api.get('/friends/requests');
    dom.requests.setAttribute('aria-busy', 'false');
    dom.requestsCount.textContent = received.length ? `(${received.length})` : '';

    if (received.length === 0) {
      dom.requests.innerHTML = '<div class="state"><p class="state__text">Aucune demande en attente. Vos compagnons sont à jour !</p></div>';
      return;
    }

    dom.requests.innerHTML = `
      <div class="copains__grid">
        ${received.map((r) => miniCard(r.from, `
          <p class="copain-card__meta">souhaite devenir ${copainWord(r.from?.gender)} de <strong>${escapeHtml(r.toMyAnimal?.name ?? '')}</strong></p>
          <div class="copain-card__actions">
            <button class="btn btn--success btn--small" data-action="accept" data-id="${r.id}">Accepter <i class="fa-solid fa-paw" aria-hidden="true"></i></button>
            <button class="btn btn--danger btn--small" data-action="refuse" data-id="${r.id}">Refuser</button>
          </div>
        `)).join('')}
      </div>
    `;
  } catch (err) {
    dom.requests.innerHTML = errorState(err.message);
  }
}

// -----------------------------------------------------------------------------
// Suggestions (localisation + copains en commun)
// -----------------------------------------------------------------------------

function reasonChips(s) {
  const chips = [];
  if (s.mutualCount > 0) {
    chips.push(`<span class="card__tag card__tag--protected"><i class="fa-solid fa-paw" aria-hidden="true"></i> ${s.mutualCount} copain${s.mutualCount > 1 ? 's' : ''} en commun</span>`);
  }
  if (s.sameLocation) {
    chips.push('<span class="card__tag card__tag--protected"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Même coin</span>');
  }
  if (chips.length === 0) {
    chips.push('<span class="card__tag"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Découverte</span>');
  }
  return `<div class="card__tags">${chips.join('')}</div>`;
}

async function loadSuggestions() {
  try {
    const suggestions = await api.get('/friends/suggestions');
    dom.suggestions.setAttribute('aria-busy', 'false');

    if (myAnimals.length === 0) {
      dom.suggestions.innerHTML = `
        <div class="state">
          <h3 class="state__title">D'abord, présentez votre compagnon !</h3>
          <p class="state__text">Créez le profil de votre animal pour qu'il puisse se faire des copains.</p>
          <p><a class="btn btn--primary" href="/creer-profil.html"><i class="fa-solid fa-paw" aria-hidden="true"></i> Créer son profil</a></p>
        </div>
      `;
      return;
    }
    if (suggestions.length === 0) {
      dom.suggestions.innerHTML = '<div class="state"><p class="state__text">Pas de nouvelle suggestion pour le moment.</p></div>';
      return;
    }

    dom.suggestions.innerHTML = `
      <div class="copains__grid">
        ${suggestions.map((s) => miniCard(s, `
          ${reasonChips(s)}
          <div class="copain-card__actions">
            <button class="btn btn--primary btn--small" data-action="add" data-id="${s.id}">${copainLabel(s.gender)}</button>
          </div>
        `)).join('')}
      </div>
    `;
  } catch (err) {
    dom.suggestions.innerHTML = errorState(err.message);
  }
}

// -----------------------------------------------------------------------------
// La bande (copains acceptés -> profils accessibles)
// -----------------------------------------------------------------------------

async function loadFriends() {
  try {
    const friends = await api.get('/friends');
    dom.friends.setAttribute('aria-busy', 'false');
    dom.friendsCount.textContent = friends.length ? `(${friends.length})` : '';

    if (friends.length === 0) {
      dom.friends.innerHTML = '<div class="state"><p class="state__text">Pas encore de copains : lancez-vous avec les suggestions ci-dessus !</p></div>';
      return;
    }

    dom.friends.innerHTML = `
      <div class="copains__grid">
        ${friends.map((f) => miniCard(f, `
          <p class="copain-card__meta">${copainWord(f.gender) === 'copine' ? 'Copine' : 'Copain'} de <strong>${escapeHtml(f.withMyAnimalName ?? '')}</strong></p>
          <div class="copain-card__actions">
            <a class="btn btn--ghost btn--small" href="/profil-detail.html?id=${f.id}">Voir le profil</a>
          </div>
        `)).join('')}
      </div>
    `;
  } catch (err) {
    dom.friends.innerHTML = errorState(err.message);
  }
}

// -----------------------------------------------------------------------------
// Actions (accepter / refuser / ajouter) — délégation
// -----------------------------------------------------------------------------

document.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  button.disabled = true;

  try {
    if (action === 'accept') {
      await api.post(`/friends/requests/${id}/accept`);
      await Promise.all([loadRequests(), loadFriends(), loadSuggestions()]);
    } else if (action === 'refuse') {
      await api.post(`/friends/requests/${id}/refuse`);
      await loadRequests();
    } else if (action === 'add') {
      await api.post('/friends/requests', { fromAnimalId: actingAnimalId(), toAnimalId: Number(id) });
      button.innerHTML = 'Demande envoyée <i class="fa-solid fa-check" aria-hidden="true"></i>';
    }
  } catch (err) {
    alert(`Erreur : ${err.message}`);
    button.disabled = false;
  }
});

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------

async function init() {
  try {
    await loadMyAnimals();
  } catch {
    myAnimals = [];
  }
  loadRequests();
  loadSuggestions();
  loadFriends();
}

init();
