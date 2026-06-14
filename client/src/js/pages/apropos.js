// Page À propos — la galerie « En images » est alimentée par de vraies photos
// d'animaux de l'API et présentée en carrousel qui défile en boucle continue
// (pause au survol). Cliquer sur un animal ouvre sa fiche en modale :
//   - visiteur non connecté  -> invitation à se connecter / créer un compte ;
//   - membre connecté        -> fiche (ou aperçu si le profil est privé) avec
//                               possibilité d'envoyer une demande de copinage,
//                               le serveur appliquant la politique de l'animal.
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { escapeHtml, speciesLine, tagsHtml, copainLabel } from '../animal-view.js';

const track = document.getElementById('gallery-track');
const marquee = document.getElementById('gallery-marquee');
const modal = document.getElementById('animal-modal');
const modalBody = document.getElementById('animal-modal-body');
const modalTitle = document.getElementById('animal-modal-title');
const closeBtn = document.getElementById('close-animal-modal');

const REDIRECT = encodeURIComponent('/apropos.html');
let myAnimals = null; // cache des animaux du membre (chargé à la 1re ouverture)

// =============================================================================
// Carrousel
// =============================================================================
// `hidden` : la seconde copie (doublon pour la boucle sans couture) est retirée
// du flux d'accessibilité et du focus clavier pour ne pas être annoncée 2 fois.
function itemHtml(animal, hidden = false) {
  const name = escapeHtml(animal.name || 'un animal de la communauté');
  return `
    <button type="button" class="gallery-marquee__item" data-id="${animal.id}"
      aria-label="Voir la fiche de ${name}"${hidden ? ' aria-hidden="true" tabindex="-1"' : ''}>
      <img src="${escapeHtml(animal.imageUrl)}" alt="${hidden ? '' : `Photo de ${name}`}" loading="lazy" />
    </button>`;
}

function hideGallery() {
  marquee?.closest('.apropos__gallery')?.setAttribute('hidden', '');
}

async function loadGallery() {
  if (!track || !marquee) return;
  try {
    const animals = await api.get('/animals/featured?limit=8');
    const withImage = animals.filter((a) => a.imageUrl);
    if (withImage.length === 0) {
      hideGallery();
      return;
    }
    // Deux copies enchaînées : un défilement de -50 % boucle sans couture.
    const original = withImage.map((a) => itemHtml(a)).join('');
    const clone = withImage.map((a) => itemHtml(a, true)).join('');
    track.innerHTML = original + clone;
    // Durée proportionnelle au nombre d'images (~4 s par image).
    track.style.setProperty('--marquee-duration', `${withImage.length * 4}s`);
  } catch {
    hideGallery();
  }
}

// =============================================================================
// Modale
// =============================================================================
function openModal() {
  modal.setAttribute('data-open', 'true');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  closeBtn?.focus();
}

function closeModal() {
  modal.setAttribute('data-open', 'false');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

closeBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal?.getAttribute('data-open') === 'true') closeModal();
});

// Délégation : un clic sur une vignette ouvre la fiche correspondante.
track?.addEventListener('click', (event) => {
  const item = event.target.closest('.gallery-marquee__item');
  if (item?.dataset.id) showAnimal(Number(item.dataset.id));
});

async function showAnimal(id) {
  openModal();
  modalTitle.textContent = 'Fiche animal';
  modalBody.innerHTML = '<div class="skeleton-card" style="height:220px"></div>';
  try {
    const animal = await api.get(`/animals/${id}`);
    renderFull(animal);
  } catch (err) {
    if (err.status === 401) { renderGate(); return; }
    if (err.status === 403 && err.body?.preview) { renderPreview(err.body.preview); return; }
    modalBody.innerHTML = `<p class="auth-feedback auth-feedback--error">${escapeHtml(err.message || 'Profil indisponible pour le moment.')}</p>`;
  }
}

// Visiteur non connecté : invitation à se connecter ou à créer un compte.
function renderGate() {
  modalTitle.textContent = 'Rejoignez Pet\'s Book';
  modalBody.innerHTML = `
    <div class="animal-modal__gate">
      <p><i class="fa-solid fa-lock" aria-hidden="true"></i> Connectez-vous ou créez un compte pour découvrir la fiche de cet animal et l'ajouter en copain.</p>
      <div class="animal-modal__actions">
        <a class="btn btn--primary" href="/login.html?redirect=${REDIRECT}">Se connecter</a>
        <a class="btn btn--ghost" href="/register.html">Créer un compte</a>
      </div>
    </div>
  `;
}

// Profil privé : aperçu minimal + demande de copinage.
function renderPreview(preview) {
  modalTitle.textContent = preview.name || 'Fiche animal';
  modalBody.innerHTML = `
    <div class="animal-modal__card">
      <img class="animal-modal__media" src="${escapeHtml(preview.imageUrl || '/placeholder-pet.svg')}" alt="" />
      <h3 class="animal-modal__name">${escapeHtml(preview.name)}</h3>
      <p class="animal-modal__meta">${escapeHtml(preview.species || '')}</p>
      <p><i class="fa-solid fa-lock" aria-hidden="true"></i> Ce profil est privé : devenez copains pour le découvrir !</p>
      <div class="auth-feedback" id="modal-friend-feedback" role="alert" aria-live="polite"></div>
      <div id="modal-friend-zone"></div>
    </div>
  `;
  mountFriendZone(preview);
}

// Profil complet (public, copain, propriétaire ou admin).
function renderFull(animal) {
  modalTitle.textContent = animal.name || 'Fiche animal';
  const facts = [
    ['Espèce et race', speciesLine(animal)],
    ['Âge', animal.age],
    ['Tempérament', animal.temperament],
    ['Membre de la famille', animal.ownerName || null],
  ].filter(([, value]) => value);

  modalBody.innerHTML = `
    <div class="animal-modal__card">
      <img class="animal-modal__media" src="${escapeHtml(animal.imageUrl || '/placeholder-pet.svg')}" alt="Photo de ${escapeHtml(animal.name)}" />
      ${tagsHtml(animal)}
      <h3 class="animal-modal__name">${escapeHtml(animal.name)}</h3>
      ${animal.physicalDesc ? `<p>${escapeHtml(animal.physicalDesc)}</p>` : ''}
      <dl class="animal-modal__facts">
        ${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
      </dl>
      <a class="btn btn--ghost btn--small" href="/profil-detail.html?id=${animal.id}">Voir la fiche complète</a>
      <div class="auth-feedback" id="modal-friend-feedback" role="alert" aria-live="polite"></div>
      <div id="modal-friend-zone"></div>
    </div>
  `;

  // Pas de bouton « ajouter en copain » sur ses propres animaux.
  const user = auth.getUser();
  if (!(user && animal.ownerId === user.id)) {
    mountFriendZone(animal);
  }
}

// Zone « ajouter en copain » — partagée par l'aperçu privé et le profil complet.
async function mountFriendZone(target) {
  const zone = document.getElementById('modal-friend-zone');
  if (!zone) return;

  if (myAnimals === null) {
    try { myAnimals = await api.get('/animals/mine'); }
    catch { myAnimals = []; }
  }

  if (myAnimals.length === 0) {
    zone.innerHTML = `
      <p>Créez d'abord le profil de votre animal pour pouvoir l'ajouter en copain !</p>
      <a class="btn btn--primary" href="/creer-profil.html"><i class="fa-solid fa-paw" aria-hidden="true"></i> Créer le profil de mon animal</a>`;
    return;
  }

  const selector = myAnimals.length > 1
    ? `<select class="form__select" id="modal-from-animal" aria-label="Choisir mon animal">
         ${myAnimals.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}
       </select>`
    : '';

  zone.innerHTML = `
    <div class="animal-modal__friend">
      ${selector}
      <button class="btn btn--primary" type="button" id="modal-add-friend">${copainLabel(target.gender)}</button>
    </div>`;

  document.getElementById('modal-add-friend')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const fromAnimalId = Number(document.getElementById('modal-from-animal')?.value || myAnimals[0].id);
    const feedback = document.getElementById('modal-friend-feedback');
    button.disabled = true;
    try {
      await api.post('/friends/requests', { fromAnimalId, toAnimalId: target.id });
      feedback.innerHTML = 'Demande envoyée ! Son humain doit maintenant accepter <i class="fa-solid fa-paw" aria-hidden="true"></i>';
      feedback.className = 'auth-feedback auth-feedback--success';
      button.textContent = 'Demande envoyée';
    } catch (err) {
      feedback.textContent = err.message || 'Erreur lors de l\'envoi de la demande.';
      feedback.className = 'auth-feedback auth-feedback--error';
      button.disabled = false;
    }
  });
}

loadGallery();
