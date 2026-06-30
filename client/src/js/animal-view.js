// Helpers de présentation des animaux, partagés par les pages accueil / profils.
// Les données viennent de sources hétérogènes : selon l'origine, certaines
// colonnes sont vides — ces helpers choisissent ce qu'il y a de mieux à afficher.
import { BASE_URL } from './utils/path-utils.js';

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
// protégé et complet, plus la jauge monte. Les 3 piliers (identification,
// stérilisation, vaccination) valent 30 % chacun, la photo 10 %.
// -----------------------------------------------------------------------------
export function protectionScore(animal) {
  let score = 0;
  if (animal.identified === 1) score += 30;
  if (animal.sterilized === 1) score += 30;
  if (animal.vaccinated === 1) score += 30;
  if (animal.imageUrl) score += 10;
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
      <span class="gauge__label"><i class="fa-solid fa-paw" aria-hidden="true"></i> ${score}&nbsp;% — ${label}</span>
    </div>
  `;
}

// Génère une balise <picture> (AVIF/WebP) pour les images statiques sous /images/.
// Pour les autres (uploads, externes, SVG), garde un <img> avec lazy loading.
// Le paramètre `dim` est optionnel : "WxH" pour ajouter width/height et éviter le CLS.
export function responsiveImage(src, alt, className = '', dim = '', lazy = true) {
  let url = src || '/placeholder-pet.svg';
  // Préfixer les chemins locaux avec la base Vite (ex: /Pet-s-Book/ en production GitHub Pages)
  if (url.startsWith('/') && !url.startsWith('//')) {
    url = BASE_URL + url.slice(1);
  }
  const escapedSrc = escapeHtml(url);
  const escapedAlt = escapeHtml(alt);
  const cls = className ? ` class="${className}"` : '';
  const loading = lazy ? ' loading="lazy"' : '';
  let dims = '';
  if (dim) {
    const [w, h] = dim.split('x');
    dims = ` width="${w}" height="${h}"`;
  }

  // SVG, placeholder, uploads, URLs externes → <img> simple
  // Attention : certaines CDN ont /images/ dans leur chemin (ex. cdn2.thecatapi.com/images/…),
  // il faut les traiter comme des URLs externes et pas comme des images statiques locales.
  const isExternal = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
  if (url.endsWith('.svg') || isExternal || !url.includes('/images/')) {
    return `<img src="${escapedSrc}" alt="${escapedAlt}"${cls}${dims}${loading} />`;
  }

  // Images statiques converties en WebP/AVIF → <picture>
  const base = url.replace(/\.(jpg|jpeg|png)$/i, '');
  return `<picture>
    <source srcset="${base}.avif" type="image/avif" />
    <source srcset="${base}.webp" type="image/webp" />
    <img src="${escapedSrc}" alt="${escapedAlt}"${cls}${dims}${loading} />
  </picture>`;
}

// Étiquettes HTML : volet sensibilisation — identification et stérilisation.
// Vert quand l'animal est protégé, neutre sinon (le détail explique pourquoi).
export function tagsHtml(animal) {
  const tags = [];

  if (animal.identified === 1) {
    tags.push('<span class="card__tag card__tag--protected"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Identifié</span>');
  } else if (animal.identified === 0) {
    tags.push('<span class="card__tag card__tag--todo">Pas encore identifié</span>');
  }

  if (animal.sterilized === 1) {
    tags.push('<span class="card__tag card__tag--protected"><i class="fa-solid fa-heart" aria-hidden="true"></i> Stérilisé</span>');
  } else if (animal.sterilized === 0) {
    tags.push('<span class="card__tag card__tag--todo">Non stérilisé</span>');
  }

  if (animal.vaccinated === 1) {
    tags.push('<span class="card__tag card__tag--protected"><i class="fa-solid fa-syringe" aria-hidden="true"></i> Vacciné</span>');
  } else if (animal.vaccinated === 0) {
    tags.push('<span class="card__tag card__tag--todo">Non vacciné</span>');
  }

  return tags.length ? `<div class="card__tags">${tags.join('')}</div>` : '';
}
