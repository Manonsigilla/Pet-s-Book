// Page admin — file d'attente des annonces + modération des profils.
// Accès gardé côté client (redirige si non admin) ET côté serveur (requireAdmin).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';

const pendingList = document.getElementById('pending-list');
const pendingCount = document.getElementById('pending-count');
const animalsList = document.getElementById('animals-list');
const animalsCount = document.getElementById('animals-count');
const messagesList = document.getElementById('messages-list');
const messagesCount = document.getElementById('messages-count');

const MESSAGE_TYPE_LABELS = { contact: 'Contact', suggestion: 'Suggestion', plainte: 'Plainte' };

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// -----------------------------------------------------------------------------
// Garde d'accès — redirige vers /login si non admin
// -----------------------------------------------------------------------------
function ensureAdmin() {
  if (!auth.isAuthenticated()) {
    window.location.replace(`/login.html?redirect=${encodeURIComponent('/admin.html')}`);
    return false;
  }
  if (!auth.isAdmin()) {
    document.querySelector('main').innerHTML = `
      <div class="state state--error" role="alert">
        <h1 class="state__title">Accès refusé</h1>
        <p class="state__text">Cette page est réservée aux administrateurs.</p>
        <p><a class="btn btn--primary" href="/index.html">Retour à l'accueil</a></p>
      </div>
    `;
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Rendu — annonces en attente
// -----------------------------------------------------------------------------
function renderPending(reports) {
  pendingList.setAttribute('aria-busy', 'false');
  pendingCount.textContent = `${reports.length} en attente`;

  if (reports.length === 0) {
    pendingList.innerHTML = `
      <div class="state">
        <p class="state__text">Aucune annonce en attente. Tout est à jour !</p>
      </div>
    `;
    return;
  }

  pendingList.innerHTML = `
    <ul class="admin-list">
      ${reports.map((r) => `
        <li class="admin-item" data-id="${r.id}">
          <img
            class="admin-item__media"
            src="${escapeHtml(r.imageUrl || '/placeholder-pet.svg')}"
            alt=""
          />
          <div class="admin-item__info">
            <h3 class="admin-item__title">${escapeHtml(r.animalName)}</h3>
            <p class="admin-item__meta">
              <span>${escapeHtml(r.species)}</span>
              <span>${escapeHtml(r.status === 'lost' ? 'Perdu' : r.status === 'found' ? 'Trouvé' : 'Clos')}</span>
              <span>Le ${escapeHtml(r.lostDate)}</span>
              <span>${escapeHtml(r.location)}</span>
            </p>
            <p>${escapeHtml(r.description)}</p>
            <p class="admin-item__meta">
              <span>Contact : ${escapeHtml(r.contact)}</span>
              ${r.reporterName ? `<span>Par ${escapeHtml(r.reporterName)}</span>` : ''}
            </p>
          </div>
          <div class="admin-item__actions">
            <button class="btn btn--success btn--small" data-action="approve" data-id="${r.id}">
              Approuver
            </button>
            <button class="btn btn--danger btn--small" data-action="reject" data-id="${r.id}">
              Rejeter
            </button>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

// -----------------------------------------------------------------------------
// Rendu — liste des animaux
// -----------------------------------------------------------------------------
function renderAnimals(animals) {
  animalsList.setAttribute('aria-busy', 'false');
  animalsCount.textContent = `${animals.length} profil${animals.length > 1 ? 's' : ''}`;

  if (animals.length === 0) {
    animalsList.innerHTML = '<div class="state"><p class="state__text">Aucun profil d\'animal.</p></div>';
    return;
  }

  animalsList.innerHTML = `
    <ul class="admin-list">
      ${animals.map((a) => `
        <li class="admin-item" data-id="${a.id}">
          <img
            class="admin-item__media"
            src="${escapeHtml(a.imageUrl || '/placeholder-pet.svg')}"
            alt=""
          />
          <div class="admin-item__info">
            <h3 class="admin-item__title">${escapeHtml(a.name)}</h3>
            <p class="admin-item__meta">
              <span>${escapeHtml(a.species)}</span>
              ${a.breed ? `<span>${escapeHtml(a.breed)}</span>` : ''}
              <span>Source : ${escapeHtml(a.source || "Pet's Book")}</span>
              ${a.ownerName ? `<span>Propriétaire : ${escapeHtml(a.ownerName)}</span>` : ''}
            </p>
            <p>${escapeHtml(a.temperament || a.physicalDesc || '')}</p>
          </div>
          <div class="admin-item__actions">
            <a class="btn btn--ghost btn--small" href="/profil-detail.html?id=${a.id}">Voir</a>
            <button class="btn btn--danger btn--small" data-action="delete-animal" data-id="${a.id}">
              Supprimer
            </button>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

// -----------------------------------------------------------------------------
// Rendu — messages reçus (contact + suggestions/plaintes)
// -----------------------------------------------------------------------------
function renderMessages(messages) {
  messagesList.setAttribute('aria-busy', 'false');
  messagesCount.textContent = `${messages.length} message${messages.length > 1 ? 's' : ''}`;

  if (messages.length === 0) {
    messagesList.innerHTML = '<div class="state"><p class="state__text">Aucun message reçu.</p></div>';
    return;
  }

  messagesList.innerHTML = `
    <ul class="admin-list">
      ${messages.map((m) => `
        <li class="admin-item admin-item--message${m.isHandled ? ' admin-item--handled' : ''}" data-id="${m.id}">
          <div class="admin-item__info">
            <p class="admin-item__meta">
              <span>${escapeHtml(MESSAGE_TYPE_LABELS[m.type] || m.type)}</span>
              ${m.isHandled ? '<span><i class="fa-solid fa-check" aria-hidden="true"></i> Traité</span>' : ''}
              <span>${escapeHtml(m.createdAt)}</span>
            </p>
            <h3 class="admin-item__title">${escapeHtml(m.subject || '(sans sujet)')}</h3>
            <p>${escapeHtml(m.body)}</p>
            <p class="admin-item__meta">
              <span>De : ${escapeHtml(m.name)}</span>
              <span><a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a></span>
            </p>
          </div>
          <div class="admin-item__actions">
            ${m.isHandled ? '' : `<button class="btn btn--success btn--small" data-action="handle-message" data-id="${m.id}">Marquer traité</button>`}
            <button class="btn btn--danger btn--small" data-action="delete-message" data-id="${m.id}">Supprimer</button>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

// -----------------------------------------------------------------------------
// Gestionnaires d'actions — délégation d'événements
// -----------------------------------------------------------------------------
async function handleAction(target) {
  const action = target.dataset.action;
  const id = Number(target.dataset.id);
  if (!action || !id) return;

  const labels = {
    approve: 'Approbation...',
    reject: 'Rejet...',
    'delete-animal': 'Suppression...',
    'handle-message': 'Traitement...',
    'delete-message': 'Suppression...',
  };
  const originalText = target.textContent;
  target.disabled = true;
  target.textContent = labels[action];

  try {
    if (action === 'approve') {
      await api.post(`/lost/${id}/approve`);
      await loadPending();
    } else if (action === 'reject') {
      if (!confirm('Supprimer définitivement cette annonce ?')) {
        target.disabled = false;
        target.textContent = originalText;
        return;
      }
      await api.post(`/lost/${id}/reject`);
      await loadPending();
    } else if (action === 'delete-animal') {
      if (!confirm('Supprimer définitivement ce profil ?')) {
        target.disabled = false;
        target.textContent = originalText;
        return;
      }
      await api.delete(`/animals/${id}`);
      await loadAnimals();
    } else if (action === 'handle-message') {
      await api.post(`/messages/${id}/handle`);
      await loadMessages();
    } else if (action === 'delete-message') {
      if (!confirm('Supprimer définitivement ce message ?')) {
        target.disabled = false;
        target.textContent = originalText;
        return;
      }
      await api.delete(`/messages/${id}`);
      await loadMessages();
    }
  } catch (err) {
    alert(`Erreur : ${err.message}`);
    target.disabled = false;
    target.textContent = originalText;
  }
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('button[data-action]');
  if (target) handleAction(target);
});

// -----------------------------------------------------------------------------
// Chargements
// -----------------------------------------------------------------------------
async function loadPending() {
  pendingList.setAttribute('aria-busy', 'true');
  try {
    const reports = await api.get('/lost/pending');
    renderPending(reports);
  } catch (err) {
    pendingList.innerHTML = `
      <div class="state state--error" role="alert">
        <p class="state__text">Impossible de charger la file d'attente : ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

async function loadAnimals() {
  animalsList.setAttribute('aria-busy', 'true');
  try {
    const animals = await api.get('/animals');
    renderAnimals(animals);
  } catch (err) {
    animalsList.innerHTML = `
      <div class="state state--error" role="alert">
        <p class="state__text">Impossible de charger les profils : ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

async function loadMessages() {
  messagesList.setAttribute('aria-busy', 'true');
  try {
    const messages = await api.get('/messages');
    renderMessages(messages);
  } catch (err) {
    messagesList.innerHTML = `
      <div class="state state--error" role="alert">
        <p class="state__text">Impossible de charger les messages : ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

if (ensureAdmin()) {
  loadPending();
  loadAnimals();
  loadMessages();
}
