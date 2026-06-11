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

// « Ajouter en copain » / « en copine » selon le sexe de l'animal.
export function copainLabel(gender) {
  if (gender === 'Femelle') return 'Ajouter en copine';
  if (gender === 'Mâle') return 'Ajouter en copain';
  return 'Ajouter en copain·copine';
}

export function copainWord(gender) {
  if (gender === 'Femelle') return 'copine';
  if (gender === 'Mâle') return 'copain';
  return 'copain·copine';
}

// -----------------------------------------------------------------------------
// Score de protection — rend la sensibilisation ludique : plus le profil est
// protégé et complet, plus la jauge monte.
//   identification 35 % + stérilisation 35 % + photo 10 % + race/âge/sexe/caractère 5 % chacun
// -----------------------------------------------------------------------------
export function protectionScore(animal) {
  let score = 0;
  if (animal.identified === 1) score += 35;
  if (animal.sterilized === 1) score += 35;
  if (animal.imageUrl) score += 10;
  if (animal.breed) score += 5;
  if (animal.age) score += 5;
  if (animal.gender) score += 5;
  if (animal.temperament) score += 5;
  return score;
}

export function gaugeHtml(animal) {
  const score = protectionScore(animal);
  const level = score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low';
  const label = score >= 80
    ? 'Super protégé !'
    : score >= 50
      ? 'En bonne voie'
      : 'Sa protection peut faire mieux';
  return `
    <div class="gauge" role="img" aria-label="Score de protection : ${score} sur 100">
      <div class="gauge__bar"><div class="gauge__fill gauge__fill--${level}" style="width:${score}%"></div></div>
      <span class="gauge__label">🐾 ${score}&nbsp;% — ${label}</span>
    </div>
  `;
}

// Étiquettes HTML : volet sensibilisation — identification et stérilisation.
// Vert quand l'animal est protégé, neutre sinon (le détail explique pourquoi).
export function tagsHtml(animal) {
  const tags = [];

  if (animal.identified === 1) {
    tags.push('<span class="card__tag card__tag--protected">🛡️ Identifié</span>');
  } else if (animal.identified === 0) {
    tags.push('<span class="card__tag card__tag--todo">Pas encore identifié</span>');
  }

  if (animal.sterilized === 1) {
    tags.push('<span class="card__tag card__tag--protected">💚 Stérilisé</span>');
  } else if (animal.sterilized === 0) {
    tags.push('<span class="card__tag card__tag--todo">Non stérilisé</span>');
  }

  return tags.length ? `<div class="card__tags">${tags.join('')}</div>` : '';
}
