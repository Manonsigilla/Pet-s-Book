// Page Profil détaillé — récupère un animal par son id passé en query string.
// Les profils sont privés : un membre n'y accède que si l'un de ses animaux
// est copain avec lui (sinon : aperçu + demande de copinage).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { escapeHtml, speciesLine, tagsHtml, sourceLabel, gaugeHtml, copainLabel, copainWord, responsiveImage } from '../animal-view.js';
import { reactionBarHtml, bindReactions } from '../reactions.js';

const container = document.getElementById('profil-detail');

function renderState(html, busy = false) {
  container.setAttribute('aria-busy', String(busy));
  container.innerHTML = html;
}

// Volet sensibilisation : statut de protection avec justification éventuelle.
function protectionHtml(animal) {
  const rows = [];

  if (animal.identified === 1) {
    rows.push('<li class="protection__item protection__item--ok"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Identifié (puce ou tatouage) — il pourra toujours retrouver sa famille !</li>');
  } else if (animal.identified === 0) {
    rows.push(`<li class="protection__item protection__item--todo">Pas encore identifié${animal.identifiedReason ? ` — <em>${escapeHtml(animal.identifiedReason)}</em>` : ''}</li>`);
  }

  if (animal.sterilized === 1) {
    rows.push('<li class="protection__item protection__item--ok"><i class="fa-solid fa-heart" aria-hidden="true"></i> Stérilisé — protégé de nombreuses maladies.</li>');
  } else if (animal.sterilized === 0) {
    rows.push(`<li class="protection__item protection__item--todo">Non stérilisé${animal.sterilizedReason ? ` — <em>${escapeHtml(animal.sterilizedReason)}</em>` : ''}</li>`);
  }

  if (animal.vaccinated === 1) {
    rows.push('<li class="protection__item protection__item--ok"><i class="fa-solid fa-syringe" aria-hidden="true"></i> Vacciné — protégé contre les principales maladies.</li>');
  } else if (animal.vaccinated === 0) {
    rows.push(`<li class="protection__item protection__item--todo">Non vacciné${animal.vaccinatedReason ? ` — <em>${escapeHtml(animal.vaccinatedReason)}</em>` : ''}</li>`);
  }

  if (rows.length === 0) return '';
  return `
    <section class="protection" aria-labelledby="protection-title">
      <h2 id="protection-title">Sa protection <i class="fa-solid fa-shield-halved" aria-hidden="true"></i></h2>
      ${gaugeHtml(animal)}
      <ul class="protection__list">${rows.join('')}</ul>
    </section>
  `;
}

// Profil privé : aperçu minimal + envoi d'une demande de copinage.
async function renderPrivate(preview) {
  let myAnimals = [];
  try {
    myAnimals = await api.get('/animals/mine');
  } catch { /* non connecté ou erreur : pas de formulaire */ }

  const selector = myAnimals.length > 1
    ? `<select class="form__select" id="from-animal">
         ${myAnimals.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}
       </select>`
    : '';

  const cta = myAnimals.length === 0
    ? `<p>Pour devenir ${copainWord(preview.gender)} de ${escapeHtml(preview.name)}, créez d'abord le profil de votre animal !</p>
       <a class="btn btn--primary" href="./creer-profil.html"><i class="fa-solid fa-paw" aria-hidden="true"></i> Créer le profil de mon animal</a>`
    : `${selector}
       <button class="btn btn--primary" type="button" id="add-friend-btn">${copainLabel(preview.gender)}</button>`;

  renderState(`
    <div class="profil-prive">
      ${responsiveImage(preview.imageUrl || '/placeholder-pet.svg', '', 'profil-prive__media', '', false)}
      <h1>${escapeHtml(preview.name)}</h1>
      <p class="profil-prive__meta">${escapeHtml(preview.species)}</p>
      <p><i class="fa-solid fa-lock" aria-hidden="true"></i> Ce profil est privé : seuls ses copains et copines peuvent le découvrir.</p>
      <div class="auth-feedback" id="friend-feedback" role="alert" aria-live="polite"></div>
      <div class="profil-prive__actions">${cta}</div>
    </div>
  `);

  document.getElementById('add-friend-btn')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const fromAnimalId = Number(document.getElementById('from-animal')?.value || myAnimals[0].id);
    const feedback = document.getElementById('friend-feedback');
    button.disabled = true;
    try {
      await api.post('/friends/requests', { fromAnimalId, toAnimalId: preview.id });
      feedback.innerHTML = 'Demande envoyée ! Son humain doit maintenant accepter <i class="fa-solid fa-paw" aria-hidden="true"></i>';
      feedback.className = 'auth-feedback auth-feedback--success';
    } catch (err) {
      feedback.textContent = err.message || 'Erreur lors de l\'envoi.';
      feedback.className = 'auth-feedback auth-feedback--error';
      button.disabled = false;
    }
  });
}

function renderAnimal(animal) {
  // Tableau de caractéristiques : on n'affiche que les colonnes renseignées.
  const facts = [
    ['Espèce et race', speciesLine(animal)],
    ['Âge', animal.age],
    ['Sexe', animal.gender],
    ['Couleur', animal.color],
    ['Tempérament', animal.temperament],
    ['Membre de la famille', animal.ownerName ? `${animal.ownerName}` : null],
    ['Localisation', animal.location],
    ['Source des données', sourceLabel(animal.source)],
  ].filter(([, value]) => value);

  renderState(`
    <article class="profil-detail">
      ${responsiveImage(animal.imageUrl || '/placeholder-pet.svg', `Photo de ${escapeHtml(animal.name)}`, 'profil-detail__media', '', false)}
      <div class="profil-detail__info">
        ${tagsHtml(animal)}
        <h1>${escapeHtml(animal.name)}</h1>
        ${animal.physicalDesc ? `<p>${escapeHtml(animal.physicalDesc)}</p>` : ''}
        ${protectionHtml(animal)}
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
    <section class="profil-posts" aria-labelledby="posts-title">
      <h2 id="posts-title">Ses publications <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i></h2>
      <div id="animal-posts" aria-busy="true"></div>
    </section>
  `);

  document.title = `${animal.name} — Pet's Book`;
  loadPosts(animal.id);
}

const postTimeFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' });

async function loadPosts(animalId) {
  const list = document.getElementById('animal-posts');
  try {
    const posts = await api.get(`/posts/animal/${animalId}`);
    list.setAttribute('aria-busy', 'false');
    if (posts.length === 0) {
      list.innerHTML = '<p class="profil-posts__empty">Pas encore de publication. Sa première aventure arrive bientôt !</p>';
      return;
    }
    list.innerHTML = posts.map((p) => `
      <article class="post-card">
        <p class="post-card__meta">${postTimeFmt.format(new Date(String(p.createdAt).replace(' ', 'T')))}</p>
        <p class="post-card__body">${escapeHtml(p.body)}</p>
        ${p.imageUrl ? responsiveImage(p.imageUrl, '', 'post-card__media') : ''}
        ${reactionBarHtml(p)}
      </article>
    `).join('');
    bindReactions(list);
  } catch {
    list.setAttribute('aria-busy', 'false');
    list.innerHTML = '';
  }
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
    if (err.status === 401 && !auth.isAuthenticated()) {
      window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (err.status === 403 && err.body?.preview) {
      renderPrivate(err.body.preview);
      return;
    }
    renderState(`
      <div class="state state--error" role="alert">
        <h1 class="state__title">Profil introuvable</h1>
        <p class="state__text">${escapeHtml(err.message)}</p>
      </div>
    `);
  }
}

document.addEventListener('DOMContentLoaded', init);
