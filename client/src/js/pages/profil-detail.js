// Page Profil détaillé — récupère un animal par son id passé en query string
import '../main.js';
import { api } from '../api.js';

const container = document.getElementById('profil-detail');

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderState(html, busy = false) {
  container.setAttribute('aria-busy', String(busy));
  container.innerHTML = html;
}

function renderAnimal(animal) {
  const meta = [
    animal.breed,
    animal.birthYear ? `Né(e) en ${animal.birthYear}` : null,
    animal.ownerName ? `Propriétaire : ${animal.ownerName}` : null,
  ].filter(Boolean);

  renderState(`
    <article class="profil-detail">
      <img
        class="profil-detail__media"
        src="${escapeHtml(animal.imageUrl || '/placeholder-pet.svg')}"
        alt="Photo de ${escapeHtml(animal.name)}"
      />
      <div class="profil-detail__info">
        <h1>${escapeHtml(animal.name)}</h1>
        <p class="profil-detail__meta">
          <span>${escapeHtml(animal.species)}</span>
          ${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}
        </p>
        ${animal.description ? `<p>${escapeHtml(animal.description)}</p>` : ''}
      </div>
    </article>
  `);

  document.title = `${animal.name} — Pet's Book`;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));

  if (!Number.isInteger(id) || id < 1) {
    renderState(`
      <div class="state state--error" role="alert">
        <h1 class="state__title">Profil introuvable</h1>
        <p class="state__text">L'identifiant fourni n'est pas valide.</p>
      </div>
    `);
    return;
  }

  renderState('<div class="skeleton-card" style="max-width:400px;margin:auto;"></div>', true);

  try {
    const animal = await api.get(`/animals/${id}`);
    renderAnimal(animal);
  } catch (err) {
    renderState(`
      <div class="state state--error" role="alert">
        <h1 class="state__title">Profil introuvable</h1>
        <p class="state__text">${escapeHtml(err.message)}</p>
      </div>
    `);
  }
}

document.addEventListener('DOMContentLoaded', init);
