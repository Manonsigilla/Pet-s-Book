// Page Gérer mes ventes — trois onglets : mes annonces, mes ventes (commandes
// reçues, à expédier) et mes achats (suivi + confirmation de réception).
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import {
  escapeHtml, formatPrice, formatDate,
  listingBadge, orderBadge,
} from '../shop-view.js';
import { showError, showConfirm } from '../error-display.js';

if (!auth.isAuthenticated()) {
  window.location.replace(`/login.html?redirect=${encodeURIComponent('/mes-ventes.html')}`);
}

const content = document.getElementById('tab-content');
const tabs = document.querySelectorAll('[role="tab"]');
let currentTab = 'listings';

// -----------------------------------------------------------------------------
// Mes annonces
// -----------------------------------------------------------------------------

function renderListings(listings) {
  if (listings.length === 0) {
    content.innerHTML = `
      <div class="state">
        <h2 class="state__title">Pas d'article mis en vente</h2>
        <p class="state__text">
          Un panier qui dort dans le garage, un collier devenu trop petit ?
          Donnez-leur une seconde vie et faites plaisir à un autre compagnon !
        </p>
        <p><a class="btn btn--primary" href="/vendre.html">Vendre mon premier article</a></p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <p class="mes-ventes__cta"><a class="btn btn--primary" href="/vendre.html">+ Mettre un article en vente</a></p>
    <ul class="order-list">
      ${listings.map((l) => `
        <li class="order-item" data-id="${l.id}">
          <img class="order-item__media" src="${escapeHtml(l.images?.[0] || '/placeholder-pet.svg')}" alt="" loading="lazy" decoding="async" />
          <div class="order-item__info">
            ${listingBadge(l.status)}
            <h2 class="order-item__title"><a href="/annonce.html?id=${l.id}">${escapeHtml(l.title)}</a></h2>
            <p class="order-item__meta">${formatPrice(l.priceCents)} · publiée le ${formatDate(l.createdAt)}</p>
          </div>
          <div class="order-item__actions">
            ${l.status === 'active' ? `<button class="btn btn--danger btn--small" data-action="delete-listing" data-id="${l.id}">Supprimer</button>` : ''}
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

// -----------------------------------------------------------------------------
// Mes ventes (commandes sur mes annonces) / Mes achats
// -----------------------------------------------------------------------------

function orderItemHtml(order, role) {
  // role: 'seller' (mes ventes) | 'buyer' (mes achats)
  const other = role === 'seller'
    ? `Acheteur : ${escapeHtml(order.buyerName)}`
    : `Vendeur : ${escapeHtml(order.sellerName)}`;

  let actions = '';
  if (role === 'seller' && order.status === 'paid') {
    actions = `<button class="btn btn--success btn--small" data-action="ship" data-id="${order.id}">Marquer comme expédié</button>`;
  }
  if (role === 'buyer' && order.status === 'shipped') {
    actions = `<button class="btn btn--success btn--small" data-action="confirm" data-id="${order.id}">Confirmer la réception</button>`;
  }
  if (order.status === 'paid') {
    actions += `<button class="btn btn--danger btn--small" data-action="cancel" data-id="${order.id}">Annuler</button>`;
  }

  const escrowNote = {
    paid: role === 'seller'
      ? 'Paiement retenu en séquestre — expédiez l\'article pour continuer.'
      : 'Paiement retenu en séquestre jusqu\'à réception de l\'article.',
    shipped: role === 'buyer'
      ? 'Article expédié — confirmez la réception pour libérer le paiement.'
      : 'En attente de confirmation de réception par l\'acheteur.',
    received: role === 'seller'
      ? 'Paiement libéré sur votre compte. Vente terminée <i class="fa-solid fa-check" aria-hidden="true"></i>'
      : 'Transaction terminée <i class="fa-solid fa-check" aria-hidden="true"></i>',
    cancelled: 'Commande annulée — l\'annonce est de nouveau en ligne.',
    completed: 'Achat direct auprès du professionnel — commande confirmée.',
  }[order.status] ?? '';

  return `
    <li class="order-item" data-id="${order.id}">
      <img class="order-item__media" src="${escapeHtml(order.imageUrl || '/placeholder-pet.svg')}" alt="" loading="lazy" decoding="async" />
      <div class="order-item__info">
        ${orderBadge(order.status)}
        <h2 class="order-item__title"><a href="/annonce.html?id=${order.listingId}">${escapeHtml(order.title)}</a></h2>
        <p class="order-item__meta">${formatPrice(order.priceCents)} · ${other} · le ${formatDate(order.createdAt)}</p>
        <p class="order-item__escrow">${escrowNote}</p>
      </div>
      <div class="order-item__actions">${actions}</div>
    </li>
  `;
}

function renderOrders(orders, role) {
  if (orders.length === 0) {
    content.innerHTML = role === 'seller'
      ? `<div class="state">
           <h2 class="state__title">Aucune vente pour le moment</h2>
           <p class="state__text">Vos articles attendent leur nouveau foyer : plus d'annonces, plus de chances de vendre !</p>
           <p><a class="btn btn--primary" href="/vendre.html">Vendre un article</a></p>
         </div>`
      : `<div class="state">
           <h2 class="state__title">Aucun achat pour le moment</h2>
           <p class="state__text">Faites un tour dans la boutique, votre compagnon mérite bien un petit cadeau.</p>
           <p><a class="btn btn--primary" href="/petsshop.html">Parcourir la boutique</a></p>
         </div>`;
    return;
  }
  content.innerHTML = `<ul class="order-list">${orders.map((o) => orderItemHtml(o, role)).join('')}</ul>`;
}

// -----------------------------------------------------------------------------
// Chargement des onglets
// -----------------------------------------------------------------------------

async function loadTab(tab) {
  currentTab = tab;
  content.setAttribute('aria-busy', 'true');
  content.innerHTML = '<div class="skeleton-card" style="max-width:480px;" aria-hidden="true"></div>';
  try {
    if (tab === 'listings') {
      renderListings(await api.get('/listings/mine'));
    } else if (tab === 'sales') {
      renderOrders(await api.get('/orders/sales'), 'seller');
    } else {
      renderOrders(await api.get('/orders/purchases'), 'buyer');
    }
  } catch (err) {
    content.innerHTML = `
      <div class="state state--error" role="alert">
        <p class="state__text">${escapeHtml(err.message || 'Erreur de chargement.')}</p>
      </div>
    `;
  }
  content.setAttribute('aria-busy', 'false');
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
    loadTab(tab.dataset.tab);
  });
});

// -----------------------------------------------------------------------------
// Actions (expédier / confirmer / annuler / supprimer) — délégation
// -----------------------------------------------------------------------------

content.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  const confirms = {
    'delete-listing': 'Supprimer définitivement cette annonce ?',
    cancel: 'Annuler cette commande ? L\'annonce sera remise en ligne.',
    confirm: 'Confirmer la réception ? Le paiement sera définitivement reversé au vendeur.',
  };
  if (confirms[action] && !await showConfirm(confirms[action], 'Confirmer')) return;

  button.disabled = true;
  try {
    if (action === 'delete-listing') await api.delete(`/listings/${id}`);
    else if (action === 'ship') await api.post(`/orders/${id}/ship`);
    else if (action === 'confirm') await api.post(`/orders/${id}/confirm`);
    else if (action === 'cancel') await api.post(`/orders/${id}/cancel`);
    await loadTab(currentTab);
  } catch (err) {
    showError(button, `Erreur : ${err.message}`);
    button.disabled = false;
  }
});

loadTab('listings');
