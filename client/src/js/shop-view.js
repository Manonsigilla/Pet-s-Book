// Helpers de présentation du marketplace Pet's Shop, partagés par les pages
// boutique / annonce / vendre / mes-ventes / messages.

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const priceFmt = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });
export function formatPrice(cents) {
  return priceFmt.format((Number(cents) || 0) / 100);
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium' });
export function formatDate(sqlDate) {
  const d = new Date(String(sqlDate).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? String(sqlDate) : dateFmt.format(d);
}

export const CATEGORY_LABELS = {
  accessoire: 'Accessoires',
  jouet: 'Jouets',
  alimentation: 'Alimentation',
  habitat: 'Habitat & cages',
  hygiene: 'Hygiène & litières',
  autre: 'Autre',
};

export const CONDITION_LABELS = {
  'neuf': 'Neuf',
  'tres-bon': 'Très bon état',
  'bon': 'Bon état',
  'correct': 'État correct',
};

export const LISTING_STATUS = {
  active: { label: 'Disponible', cls: 'shop-badge--available' },
  reserved: { label: 'Réservé', cls: 'shop-badge--reserved' },
  sold: { label: 'Vendu', cls: 'shop-badge--sold' },
};

export const ORDER_STATUS = {
  paid: { label: 'Payé — en attente d\'expédition', cls: 'shop-badge--reserved' },
  shipped: { label: 'Expédié', cls: 'shop-badge--available' },
  received: { label: 'Terminé', cls: 'shop-badge--sold' },
  cancelled: { label: 'Annulé', cls: 'shop-badge--cancelled' },
  completed: { label: 'Commande confirmée', cls: 'shop-badge--sold' },
};

// Étiquette « Pro » pour les annonces vendues par un partenaire professionnel.
export function proBadge(isPro) {
  return isPro ? '<span class="shop-badge shop-badge--pro">Pro</span>' : '';
}

export function listingBadge(status) {
  const s = LISTING_STATUS[status];
  return s ? `<span class="shop-badge ${s.cls}">${s.label}</span>` : '';
}

export function orderBadge(status) {
  const s = ORDER_STATUS[status];
  return s ? `<span class="shop-badge ${s.cls}">${s.label}</span>` : '';
}

// Carte d'annonce de la grille marketplace (lien vers le détail).
export function listingCardHtml(listing) {
  const img = listing.images?.[0] || '/placeholder-pet.svg';
  return `
    <a class="shop-card" href="/annonce.html?id=${listing.id}">
      <img class="shop-card__media" src="${escapeHtml(img)}" alt="${escapeHtml(listing.title)}" loading="lazy" />
      <div class="shop-card__body">
        <div class="shop-card__badges">
          ${proBadge(listing.isPro)}
          ${listing.status !== 'active' ? listingBadge(listing.status) : ''}
        </div>
        <h2 class="shop-card__title">${escapeHtml(listing.title)}</h2>
        <p class="shop-card__price">${formatPrice(listing.priceCents)}</p>
        <p class="shop-card__meta">
          ${escapeHtml(CONDITION_LABELS[listing.condition] || listing.condition)}
          ${listing.brand ? ` · ${escapeHtml(listing.brand)}` : ''}
        </p>
        <p class="shop-card__seller">${listing.isPro ? 'Boutique' : 'Vendu par'} ${escapeHtml(listing.sellerName)}</p>
      </div>
    </a>
  `;
}
