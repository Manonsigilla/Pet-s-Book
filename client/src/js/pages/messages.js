// Page Messages — boîte de réception (gauche) + fil de conversation (droite).
// Le fil ouvert se rafraîchit automatiquement toutes les 5 secondes (polling).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { escapeHtml } from '../shop-view.js';

if (!auth.isAuthenticated()) {
  window.location.replace(`/login.html?redirect=${encodeURIComponent('/messages.html')}`);
}

const POLL_INTERVAL = 5000;

const dom = {
  list: document.getElementById('conversations-list'),
  placeholder: document.getElementById('thread-placeholder'),
  thread: document.getElementById('thread-content'),
  header: document.getElementById('thread-header'),
  messages: document.getElementById('thread-messages'),
  composer: document.getElementById('composer-form'),
  input: document.getElementById('composer-input'),
  send: document.getElementById('composer-send'),
};

const me = auth.getUser();
let conversations = [];
let openId = null;
let pollTimer = null;

const timeFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'short', timeStyle: 'short' });
function formatWhen(sqlDate) {
  const d = new Date(String(sqlDate).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : timeFmt.format(d);
}

// -----------------------------------------------------------------------------
// Boîte de réception
// -----------------------------------------------------------------------------

function renderInbox() {
  dom.list.setAttribute('aria-busy', 'false');

  if (conversations.length === 0) {
    dom.list.innerHTML = `
      <div class="state">
        <p class="state__text">Aucune conversation. Contactez un vendeur depuis une annonce pour démarrer.</p>
        <p><a class="btn btn--ghost" href="/petsshop.html">Voir la boutique</a></p>
      </div>
    `;
    return;
  }

  dom.list.innerHTML = `
    <ul class="inbox">
      ${conversations.map((c) => `
        <li>
          <button type="button" class="inbox__item${c.id === openId ? ' is-active' : ''}" data-id="${c.id}">
            <img class="inbox__thumb" src="${escapeHtml(c.listingImage || '/placeholder-pet.svg')}" alt="" />
            <span class="inbox__text">
              <span class="inbox__name">${escapeHtml(c.otherName)}
                ${c.unreadCount > 0 ? `<span class="inbox__unread">${c.unreadCount}</span>` : ''}
              </span>
              <span class="inbox__listing">${escapeHtml(c.listingTitle || 'Annonce supprimée')}</span>
              <span class="inbox__last">${escapeHtml(c.lastMessage || '')}</span>
            </span>
          </button>
        </li>
      `).join('')}
    </ul>
  `;
}

async function loadInbox() {
  try {
    conversations = await api.get('/conversations');
    renderInbox();
  } catch (err) {
    dom.list.innerHTML = `<div class="state state--error"><p class="state__text">${escapeHtml(err.message)}</p></div>`;
  }
}

// -----------------------------------------------------------------------------
// Fil de conversation
// -----------------------------------------------------------------------------

function renderThread(data) {
  const conv = conversations.find((c) => c.id === data.id);
  dom.header.innerHTML = conv ? `
    <strong>${escapeHtml(conv.otherName)}</strong>
    ${conv.listingId ? `<a href="/annonce.html?id=${conv.listingId}">${escapeHtml(conv.listingTitle)}</a>` : ''}
  ` : '';

  const previousCount = dom.messages.childElementCount;
  dom.messages.innerHTML = data.messages.map((m) => `
    <div class="bubble${m.senderId === me.id ? ' bubble--mine' : ''}">
      <p class="bubble__body">${escapeHtml(m.body)}</p>
      <span class="bubble__when">${formatWhen(m.createdAt)}</span>
    </div>
  `).join('');

  // Scrolle en bas uniquement quand il y a du nouveau (évite de gêner la lecture).
  if (dom.messages.childElementCount !== previousCount) {
    dom.messages.scrollTop = dom.messages.scrollHeight;
  }
}

async function openConversation(id, { silent = false } = {}) {
  if (!silent) {
    openId = id;
    dom.placeholder.hidden = true;
    dom.thread.hidden = false;
    dom.messages.innerHTML = '<div class="skeleton-card" style="height:80px;" aria-hidden="true"></div>';
    renderInbox();
  }
  try {
    const data = await api.get(`/conversations/${id}/messages`);
    if (id !== openId) return; // l'utilisateur a changé de fil entre-temps
    renderThread(data);
    // Ouvrir un fil remet ses non-lus à zéro dans la liste.
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      renderInbox();
    }
  } catch (err) {
    if (!silent) {
      dom.messages.innerHTML = `<div class="state state--error"><p class="state__text">${escapeHtml(err.message)}</p></div>`;
    }
  }
}

dom.list.addEventListener('click', (event) => {
  const button = event.target.closest('.inbox__item');
  if (button) openConversation(Number(button.dataset.id));
});

// -----------------------------------------------------------------------------
// Envoi d'un message
// -----------------------------------------------------------------------------

dom.composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = dom.input.value.trim();
  if (!body || !openId) return;
  dom.send.disabled = true;
  try {
    await api.post(`/conversations/${openId}/messages`, { body });
    dom.input.value = '';
    await openConversation(openId, { silent: true });
    loadInbox();
  } catch (err) {
    alert(`Erreur : ${err.message}`);
  } finally {
    dom.send.disabled = false;
    dom.input.focus();
  }
});

// Entrée envoie, Maj+Entrée fait un retour à la ligne.
dom.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    dom.composer.requestSubmit();
  }
});

// -----------------------------------------------------------------------------
// Polling : rafraîchit le fil ouvert et la boîte de réception
// -----------------------------------------------------------------------------

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (document.hidden) return; // onglet en arrière-plan : on économise les requêtes
    if (openId) openConversation(openId, { silent: true });
    loadInbox();
  }, POLL_INTERVAL);
}

// -----------------------------------------------------------------------------
// Init — ouvre la conversation passée en ?id= (arrivée depuis une annonce)
// -----------------------------------------------------------------------------

async function init() {
  await loadInbox();
  const requested = Number(new URLSearchParams(window.location.search).get('id'));
  if (Number.isInteger(requested) && requested > 0) {
    openConversation(requested);
  }
  startPolling();
}

init();
