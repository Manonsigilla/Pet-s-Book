// Page d'accueil — vitrine publique pour les visiteurs ; pour les membres
// connectés, elle se transforme en FEED : publications des copains, évènements
// proches de chez eux et contenus sponsorisés des Pages partenaires.
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { escapeHtml, speciesLine, describe, tagsHtml } from '../animal-view.js';

const FEATURED_COUNT = 3;

const container = document.getElementById('home-animals');
const counter = document.getElementById('home-count');

function renderSkeletons() {
  container.innerHTML = `
    <div class="grid-cards">
      ${Array.from({ length: FEATURED_COUNT }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join('')}
    </div>
  `;
}

function renderAnimals(animals) {
  container.setAttribute('aria-busy', 'false');
  counter.textContent = `${animals.length} animal${animals.length > 1 ? 'ux' : ''} mis en avant`;

  if (animals.length === 0) {
    container.innerHTML = '<p>Aucun profil pour le moment.</p>';
    return;
  }

  const cards = animals.map((animal) => {
    const desc = describe(animal);
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
        <h3 class="card__title">${escapeHtml(animal.name)}</h3>
        <p class="card__meta">${escapeHtml(speciesLine(animal))}</p>
        ${desc ? `<p class="card__text">${escapeHtml(desc)}</p>` : ''}
        <div class="card__footer">
          <a class="btn btn--ghost" href="/profil-detail.html?id=${animal.id}">Voir le profil</a>
        </div>
      </div>
    </article>
  `;
  }).join('');

  container.innerHTML = `<div class="grid-cards">${cards}</div>`;
}

function renderError(message) {
  container.setAttribute('aria-busy', 'false');
  counter.textContent = '';
  container.innerHTML = `
    <div class="state state--error" role="alert">
      <p class="state__text">${escapeHtml(message)}</p>
    </div>
  `;
}

async function loadAnimals() {
  renderSkeletons();
  try {
    // Vitrine publique : 3 profils en avant (infos minimales, profils privés).
    const animals = await api.get('/animals/featured');
    renderAnimals(animals.slice(0, FEATURED_COUNT));
  } catch (err) {
    renderError(err.message || 'Erreur de chargement des profils.');
  }
}

// Prochain événement — remplace le bloc statique de l'accueil par la donnée réelle.
const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' });
const timeFmt = new Intl.DateTimeFormat('fr-BE', { hour: '2-digit', minute: '2-digit' });

function formatEventDate(startsAt) {
  const d = new Date(String(startsAt).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return escapeHtml(startsAt);
  return `${dateFmt.format(d)} — ${timeFmt.format(d).replace(':', 'h')}`;
}

async function loadNextEvent() {
  const container = document.getElementById('home-event');
  if (!container) return;
  try {
    const upcoming = await api.get('/events/upcoming');
    const ev = upcoming[0];
    if (!ev) return; // pas d'événement à venir : on garde le contenu statique
    container.innerHTML = `
      <img
        class="event-feature__media"
        src="${escapeHtml(ev.imageUrl || '/placeholder-pet.svg')}"
        alt="Illustration de l'événement ${escapeHtml(ev.title)}"
        loading="lazy"
      />
      <div class="event-feature__body">
        <h3>${escapeHtml(ev.title)}</h3>
        <p class="event-feature__meta">
          <time datetime="${escapeHtml(ev.startsAt)}">${formatEventDate(ev.startsAt)}</time> · ${escapeHtml(ev.location)}
        </p>
        <p>${escapeHtml(ev.description)}</p>
        <a class="btn btn--ghost" href="/evenements.html">Voir tous les événements</a>
      </div>
    `;
  } catch {
    // Erreur réseau : le bloc statique de secours reste affiché.
  }
}

// Bouton "Écouter le carillon" — joue l'audio importé en local.
function initGreetingAudio() {
  const audio = document.getElementById('greeting-audio');
  const button = document.getElementById('play-greeting');
  if (!audio || !button) return;

  button.addEventListener('click', () => {
    if (audio.paused) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Lecture refusée par le navigateur (rare car déclenchée par un clic).
      });
      button.setAttribute('aria-pressed', 'true');
    } else {
      audio.pause();
      button.setAttribute('aria-pressed', 'false');
    }
  });

  audio.addEventListener('ended', () => {
    button.setAttribute('aria-pressed', 'false');
  });
}

// =============================================================================
// FEED (membres connectés)
// =============================================================================

const feedDom = {
  feed: document.getElementById('home-feed'),
  showcase: document.getElementById('home-showcase'),
  items: document.getElementById('feed-items'),
  eventsWrap: document.getElementById('feed-events'),
  eventsList: document.getElementById('feed-events-list'),
  composerForm: document.getElementById('composer-form'),
  composerAnimal: document.getElementById('composer-animal'),
  composerBody: document.getElementById('composer-body'),
  composerPhoto: document.getElementById('composer-photo'),
  composerPhotoName: document.getElementById('composer-photo-name'),
  composerSubmit: document.getElementById('composer-submit'),
  composerFeedback: document.getElementById('composer-feedback'),
};

const dateTimeFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' });
function formatWhen(sqlDate) {
  const d = new Date(String(sqlDate).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : dateTimeFmt.format(d);
}

function postCardHtml(item) {
  const isSponsored = item.type === 'sponsored';
  const authorName = isSponsored ? item.pageName : item.animalName;
  const authorImage = isSponsored ? item.pageImage : item.animalImage;
  const subtitle = isSponsored
    ? '<span class="post-card__sponsored">Sponsorisé</span>'
    : `<span>${escapeHtml(item.animalSpecies || '')}${item.ownerName ? ` · chez ${escapeHtml(item.ownerName)}` : ''}</span>`;
  const link = !isSponsored && item.animalId ? `href="/profil-detail.html?id=${item.animalId}"` : '';

  return `
    <article class="post-card${isSponsored ? ' post-card--sponsored' : ''}">
      <header class="post-card__header">
        <img class="post-card__avatar" src="${escapeHtml(authorImage || '/placeholder-pet.svg')}" alt="" loading="lazy" />
        <div>
          <a class="post-card__author" ${link}>${escapeHtml(authorName || '')}</a>
          <p class="post-card__meta">${subtitle} · ${formatWhen(item.createdAt)}</p>
        </div>
      </header>
      <p class="post-card__body">${escapeHtml(item.body)}</p>
      ${item.imageUrl ? `<img class="post-card__media" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" />` : ''}
    </article>
  `;
}

function feedEventHtml(ev) {
  return `
    <article class="post-card post-card--event">
      <header class="post-card__header">
        <img class="post-card__avatar" src="${escapeHtml(ev.imageUrl || '/placeholder-pet.svg')}" alt="" loading="lazy" />
        <div>
          <p class="post-card__author">📅 ${escapeHtml(ev.title)}</p>
          <p class="post-card__meta">${formatWhen(ev.startsAt)} · ${escapeHtml(ev.location)}</p>
        </div>
      </header>
      <p class="post-card__body">${escapeHtml(ev.description)}</p>
      <a class="btn btn--ghost btn--small" href="/evenements.html">Voir l'agenda</a>
    </article>
  `;
}

async function loadFeed() {
  try {
    const { events, items } = await api.get('/posts/feed');
    feedDom.items.setAttribute('aria-busy', 'false');

    if (events.length > 0) {
      feedDom.eventsWrap.hidden = false;
      feedDom.eventsList.innerHTML = events.map(feedEventHtml).join('');
    }

    feedDom.items.innerHTML = items.length
      ? items.map(postCardHtml).join('')
      : `<div class="state">
           <p class="state__text">Le fil est calme... Trouvez des copains à vos animaux pour le faire vivre !</p>
           <p><a class="btn btn--primary" href="/copains.html">Découvrir des copains</a></p>
         </div>`;
  } catch (err) {
    feedDom.items.innerHTML = `<div class="state state--error"><p class="state__text">${escapeHtml(err.message)}</p></div>`;
  }
}

async function initComposer() {
  let myAnimals = [];
  try {
    myAnimals = await api.get('/animals/mine');
  } catch { /* liste vide */ }

  if (myAnimals.length === 0) {
    feedDom.composerForm.innerHTML = `
      <p>Créez le profil de votre animal pour publier dans le fil !</p>
      <a class="btn btn--primary" href="/creer-profil.html">🐾 Créer son profil</a>
    `;
    return;
  }
  feedDom.composerAnimal.innerHTML = myAnimals
    .map((a) => `<option value="${a.id}">${escapeHtml(a.name)} publie...</option>`)
    .join('');

  feedDom.composerPhoto.addEventListener('change', () => {
    const file = feedDom.composerPhoto.files?.[0];
    feedDom.composerPhotoName.textContent = file ? `📷 ${file.name}` : '';
  });

  feedDom.composerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = feedDom.composerBody.value.trim();
    if (!body) return;

    const formData = new FormData();
    formData.append('animalId', feedDom.composerAnimal.value);
    formData.append('body', body);
    const photo = feedDom.composerPhoto.files?.[0];
    if (photo) formData.append('photo', photo);

    feedDom.composerSubmit.disabled = true;
    try {
      await api.post('/posts', formData);
      feedDom.composerBody.value = '';
      feedDom.composerPhoto.value = '';
      feedDom.composerPhotoName.textContent = '';
      feedDom.composerFeedback.textContent = '';
      await loadFeed();
    } catch (err) {
      feedDom.composerFeedback.textContent = err.message || 'Erreur lors de la publication.';
      feedDom.composerFeedback.className = 'auth-feedback auth-feedback--error';
    } finally {
      feedDom.composerSubmit.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initGreetingAudio();

  if (auth.isAuthenticated()) {
    // Membre connecté : l'accueil devient le feed.
    feedDom.showcase.hidden = true;
    feedDom.feed.hidden = false;
    initComposer();
    loadFeed();
  } else {
    // Visiteur : vitrine publique.
    loadAnimals();
    loadNextEvent();
  }
});
