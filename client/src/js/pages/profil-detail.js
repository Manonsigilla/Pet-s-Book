// Page Profil détaillé — récupère un animal par son id passé en query string
import '../main.js';
import { api } from '../api.js';
import { escapeHtml, speciesLine, tagsHtml, sourceLabel } from '../animal-view.js';

const container = document.getElementById('profil-detail');

function renderState(html, busy = false) {
  container.setAttribute('aria-busy', String(busy));
  container.innerHTML = html;
}

function renderAnimal(animal) {
  // Tableau de caractéristiques : on n'affiche que les colonnes renseignées.
  const facts = [
    ['Espèce et race', speciesLine(animal)],
    ['Âge', animal.age],
    ['Sexe', animal.gender],
    ['Couleur', animal.color],
    ['Tempérament', animal.temperament],
    ['Propriétaire', animal.ownerName],
    ['Type de prise en charge', animal.intakeType],
    ['Localisation', animal.location],
    ['Statut', animal.status],
    ['Signalé le', animal.dateListed],
    ['Source des données', sourceLabel(animal.source)],
  ].filter(([, value]) => value);

  renderState(`
    <article class="profil-detail">
      <img
        class="profil-detail__media"
        src="${escapeHtml(animal.imageUrl || '/placeholder-pet.svg')}"
        alt="Photo de ${escapeHtml(animal.name)}"
      />
      <div class="profil-detail__info">
        ${tagsHtml(animal)}
        <h1>${escapeHtml(animal.name)}</h1>
        ${animal.physicalDesc ? `<p>${escapeHtml(animal.physicalDesc)}</p>` : ''}
        <dl class="profil-detail__facts">
          ${facts.map(([label, value]) => `
            <div class="profil-detail__fact">
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join('')}
        </dl>
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
