// Helpers de présentation des animaux, partagés par les pages accueil / profils.
// Les données viennent de sources hétérogènes : selon l'origine, certaines
// colonnes sont vides — ces helpers choisissent ce qu'il y a de mieux à afficher.

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Libellés lisibles pour la colonne `source` (traçabilité de l'origine).
const SOURCE_LABELS = {
  thecatapi: 'The Cat API',
  thedogapi: 'The Dog API',
  dogceo: 'Dog CEO',
  austin: 'Austin Animal Center',
  pet911: 'Pet911',
  petsbook: "Pet's Book",
};

export function sourceLabel(source) {
  return SOURCE_LABELS[source] || source || "Pet's Book";
}

// Espèce + race(s) en une ligne : « Chien · Mastiff »
export function speciesLine(animal) {
  const parts = [capitalize(animal.species)];
  if (animal.breed) parts.push(animal.breed);
  if (animal.breedSecondary) parts.push(animal.breedSecondary);
  return parts.join(' · ');
}

// Meilleur texte descriptif disponible selon la source.
export function describe(animal) {
  return animal.temperament || animal.physicalDesc || '';
}

// Étiquettes HTML : badge source + statut d'adoption / perdu-trouvé.
export function tagsHtml(animal) {
  const tags = [`<span class="card__tag card__tag--source">${escapeHtml(sourceLabel(animal.source))}</span>`];

  if (animal.adopted === 1) {
    tags.push('<span class="card__tag card__tag--adopted">Adopté</span>');
  } else if (animal.adopted === 0 && animal.status) {
    tags.push(`<span class="card__tag card__tag--available">${escapeHtml(animal.status)}</span>`);
  } else if (animal.status) {
    tags.push(`<span class="card__tag">${escapeHtml(animal.status)}</span>`);
  }

  return `<div class="card__tags">${tags.join('')}</div>`;
}
