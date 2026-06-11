// Page Annonce — détail d'un article du marketplace : galerie photos,
// achat sécurisé (séquestre simulé) et prise de contact avec le vendeur.
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import {
  escapeHtml, formatPrice, formatDate,
  CATEGORY_LABELS, CONDITION_LABELS, listingBadge,
} from '../shop-view.js';

const container = document.getElementById('annonce-detail');
const modal = document.getElementById('buy-modal');
const modalBody = document.getElementById('buy-modal-body');

let listing = null;

function renderState(html, busy = false) {
  container.setAttribute('aria-busy', String(busy));
  container.innerHTML = html;
}

function renderNotFound(message) {
  renderState(`
    <div class="state state--error" role="alert">
      <h1 class="state__title">Annonce introuvable</h1>
      <p class="state__text">${escapeHtml(message)}</p>
    </div>
  `);
}

// -----------------------------------------------------------------------------
// Rendu du détail
// -----------------------------------------------------------------------------

function renderListing() {
  const user = auth.getUser();
  const isOwner = user && user.id === listing.sellerId;
  const images = listing.images.length ? listing.images : ['/placeholder-pet.svg'];

  const facts = [
    ['Catégorie', CATEGORY_LABELS[listing.category] || listing.category],
    ['État', CONDITION_LABELS[listing.condition] || listing.condition],
    ['Marque', listing.brand],
    ['Publiée le', formatDate(listing.createdAt)],
    ['Vendeur', listing.sellerName],
  ].filter(([, v]) => v);

  let actions;
  if (isOwner) {
    actions = `
      <p class="annonce__owner-note">C'est votre annonce.</p>
      <a class="btn btn--ghost" href="/mes-ventes.html">Gérer mes ventes</a>
    `;
  } else if (listing.status === 'active') {
    actions = `
      <button class="btn btn--primary btn--block" type="button" id="buy-btn">
        Acheter — ${formatPrice(listing.priceCents)}
      </button>
      <p class="annonce__protection">
        🛡️ <strong>Achat protégé</strong> : votre paiement est conservé en lieu sûr et
        n'est reversé au vendeur qu'après confirmation de la réception.
      </p>
    `;
  } else {
    actions = `<p class="annonce__owner-note">Cet article n'est plus disponible.</p>`;
  }

  const contactBlock = (!isOwner && user) ? `
    <div class="annonce__contact">
      <h2>Contacter le vendeur</h2>
      <div class="auth-feedback" id="contact-feedback" role="alert" aria-live="polite"></div>
      <form id="contact-seller-form" class="form">
        <div class="form__field">
          <label class="form__label visually-hidden" for="contact-body">Votre message</label>
          <textarea class="form__textarea" id="contact-body" required minlength="1" maxlength="2000"
            placeholder="Bonjour, est-ce toujours disponible ?"></textarea>
        </div>
        <button class="btn btn--ghost" type="submit">Envoyer le message</button>
      </form>
    </div>
  ` : (!isOwner ? `
    <div class="annonce__contact">
      <h2>Contacter le vendeur</h2>
      <p><a class="btn btn--ghost" href="/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}">Connectez-vous pour envoyer un message</a></p>
    </div>
  ` : '');

  renderState(`
    <article class="annonce__layout">
      <div class="annonce__gallery">
        <img class="annonce__main-photo" id="main-photo" src="${escapeHtml(images[0])}" alt="${escapeHtml(listing.title)}" />
        ${images.length > 1 ? `
          <div class="annonce__thumbs" role="group" aria-label="Autres photos">
            ${images.map((url, i) => `
              <button type="button" class="annonce__thumb${i === 0 ? ' is-active' : ''}" data-url="${escapeHtml(url)}">
                <img src="${escapeHtml(url)}" alt="Photo ${i + 1}" />
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="annonce__info">
        ${listingBadge(listing.status)}
        <h1>${escapeHtml(listing.title)}</h1>
        <p class="annonce__price">${formatPrice(listing.priceCents)}</p>
        <dl class="annonce__facts">
          ${facts.map(([label, value]) => `
            <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
          `).join('')}
        </dl>
        <h2>Description</h2>
        <p class="annonce__description">${escapeHtml(listing.description)}</p>
        <div class="annonce__actions">${actions}</div>
        ${contactBlock}
      </div>
    </article>
  `);

  document.title = `${listing.title} — Pet's Book`;
  bindGallery();
  bindBuy();
  bindContact();
}

function bindGallery() {
  const mainPhoto = document.getElementById('main-photo');
  document.querySelectorAll('.annonce__thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      mainPhoto.src = thumb.dataset.url;
      document.querySelectorAll('.annonce__thumb').forEach((t) => t.classList.toggle('is-active', t === thumb));
    });
  });
}

// -----------------------------------------------------------------------------
// Achat — modal « paiement sécurisé » (séquestre simulé, aucun débit réel)
// -----------------------------------------------------------------------------

function openModal() {
  modal.setAttribute('data-open', 'true');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.setAttribute('data-open', 'false');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function bindBuy() {
  const buyBtn = document.getElementById('buy-btn');
  if (!buyBtn) return;

  buyBtn.addEventListener('click', () => {
    if (!auth.isAuthenticated()) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    modalBody.innerHTML = `
      <div class="buy-summary">
        <p><strong>${escapeHtml(listing.title)}</strong></p>
        <dl class="buy-summary__lines">
          <div><dt>Article</dt><dd>${formatPrice(listing.priceCents)}</dd></div>
          <div><dt>Protection acheteur</dt><dd>Incluse</dd></div>
          <div class="buy-summary__total"><dt>Total</dt><dd>${formatPrice(listing.priceCents)}</dd></div>
        </dl>
        <p class="buy-summary__escrow">
          🛡️ Le montant est <strong>retenu en séquestre</strong> et ne sera reversé à
          ${escapeHtml(listing.sellerName)} qu'après que vous ayez confirmé la réception de l'article.
        </p>
        <p class="buy-summary__demo">Démonstration pédagogique : aucun paiement réel n'est effectué.</p>
        <div class="auth-feedback" id="buy-feedback" role="alert" aria-live="polite"></div>
        <button class="btn btn--primary btn--block" type="button" id="confirm-buy-btn">
          Payer ${formatPrice(listing.priceCents)}
        </button>
      </div>
    `;
    openModal();

    document.getElementById('confirm-buy-btn').addEventListener('click', async (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Paiement en cours...';
      try {
        await api.post('/orders', { listingId: listing.id });
        modalBody.innerHTML = `
          <div class="buy-summary">
            <p class="buy-summary__success">✅ Achat confirmé ! Le vendeur va préparer votre colis.</p>
            <p>Suivez votre commande depuis l'onglet « Mes achats » de votre espace ventes.</p>
            <a class="btn btn--primary btn--block" href="/mes-ventes.html">Suivre ma commande</a>
          </div>
        `;
      } catch (err) {
        document.getElementById('buy-feedback').textContent = err.message || 'Erreur lors de l\'achat.';
        document.getElementById('buy-feedback').className = 'auth-feedback auth-feedback--error';
        btn.disabled = false;
        btn.textContent = `Payer ${formatPrice(listing.priceCents)}`;
      }
    });
  });

  document.getElementById('close-buy-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.getAttribute('data-open') === 'true') closeModal();
  });
}

// -----------------------------------------------------------------------------
// Contact vendeur — crée/reprend une conversation puis redirige vers Messages
// -----------------------------------------------------------------------------

function bindContact() {
  const form = document.getElementById('contact-seller-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = document.getElementById('contact-body').value.trim();
    const fb = document.getElementById('contact-feedback');
    if (!body) return;
    try {
      const { conversationId } = await api.post('/conversations', { listingId: listing.id, body });
      window.location.href = `/messages.html?id=${conversationId}`;
    } catch (err) {
      fb.textContent = err.message || 'Erreur lors de l\'envoi.';
      fb.className = 'auth-feedback auth-feedback--error';
    }
  });
}

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------

async function init() {
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  if (!Number.isInteger(id) || id < 1) {
    renderNotFound('L\'identifiant fourni n\'est pas valide.');
    return;
  }
  renderState('<div class="skeleton-card" style="max-width:480px;margin:auto;"></div>', true);
  try {
    listing = await api.get(`/listings/${id}`);
    renderListing();
  } catch (err) {
    renderNotFound(err.message || 'Erreur de chargement.');
  }
}

document.addEventListener('DOMContentLoaded', init);
