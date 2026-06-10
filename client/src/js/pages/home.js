// Page d'accueil — charge les profils en avant depuis l'API et gère l'audio d'accueil.
import '../main.js';
import { api } from '../api.js';
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
    const animals = await api.get('/animals');
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

document.addEventListener('DOMContentLoaded', () => {
  initGreetingAudio();
  loadAnimals();
  loadNextEvent();
});
