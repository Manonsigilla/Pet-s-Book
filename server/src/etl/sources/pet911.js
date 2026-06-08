// Source #3 — Pet911.ru (scraping, animaux perdus / trouvés en Russie).
//
// Rôle : race ✅ (si renseignée), caractère ✅, image ✅, propriétaire ✅.
//
// Les pages /lost-pets et /found-pets rendues côté serveur exposent ~60 cartes
// `.pets-item` chacune. La carte donne : espèce (via l'URL), image, date,
// localisation et un extrait (= caractère). On enrichit ensuite un sous-ensemble
// via la page détail (`.card-info` libellé/valeur) pour le propriétaire, le sexe,
// la couleur et la race.
//
// robots.txt autorise ces pages ; on limite le volume et on espace les requêtes.

import * as cheerio from 'cheerio';
import { httpText, makeRow, clean, normalizeSpecies, normalizeGender, sleep } from '../lib/common.js';

const BASE = 'https://pet911.ru';
const CARDS_PER_PAGE = 15; // par page liste (lost + found)
const DETAIL_DELAY = 350;  // ms entre deux pages détail (politesse)

export async function fetchPet911() {
  const cards = [
    ...(await scrapeList('/lost-pets', 'Perdu')),
    ...(await scrapeList('/found-pets', 'Trouvé')),
  ];

  const rows = [];
  for (const card of cards) {
    const detail = await scrapeDetail(card.href).catch(() => null);
    rows.push(buildRow(card, detail));
    await sleep(DETAIL_DELAY);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Liste : .pets-item
// ---------------------------------------------------------------------------
async function scrapeList(path, statusFr) {
  const html = await httpText(`${BASE}${path}`);
  const $ = cheerio.load(html);
  const cards = [];

  $('.pets-item').slice(0, CARDS_PER_PAGE).each((_, el) => {
    const $el = $(el);
    const href = $el.find('a.pets-item__thumb').attr('href');
    if (!href) return;
    cards.push({
      href,
      status: statusFr,
      species: speciesFromHref(href),
      image: $el.find('a.pets-item__thumb img').attr('src') || null,
      date: parseRuDate($el.find('.pets-item__date').text()),
      title: clean($el.find('.pets-item__title .h3').text()),
      excerpt: clean($el.find('.pets-item__excerpt').text()),
    });
  });
  return cards;
}

// ---------------------------------------------------------------------------
// Détail : og:* + paires .card-info
// ---------------------------------------------------------------------------
async function scrapeDetail(href) {
  const html = await httpText(href.startsWith('http') ? href : `${BASE}${href}`);
  const $ = cheerio.load(html);

  const info = {};
  $('.card-info').each((_, el) => {
    const label = clean($(el).find('.card-info__title').text());
    const value = clean($(el).find('.card-info__value').text());
    if (label && value) info[label] = value;
  });

  return {
    ownerName: info['Имя хозяина'] ?? null,
    nickname: info['Кличка'] ?? null,
    gender: info['Пол питомца'] ?? null,
    color: info['Окрас'] ?? null,
    breed: info['Порода'] ?? null,
    description: $('meta[property="og:description"]').attr('content') ?? null,
    image: $('meta[property="og:image"]').attr('content') ?? null,
  };
}

function buildRow(card, detail) {
  const speciesLabel = card.species.charAt(0).toUpperCase() + card.species.slice(1);
  return makeRow({
    animal_id: idFromHref(card.href),
    source: 'pet911',
    species: card.species,
    breed: clean(detail?.breed),
    name: clean(detail?.nickname) ?? `${speciesLabel} ${card.status.toLowerCase()}`,
    gender: normalizeGender(detail?.gender),
    color: clean(detail?.color),
    physical_desc: clean(detail?.description) ?? card.excerpt,
    temperament: card.excerpt,
    status: card.status,
    owner_name: clean(detail?.ownerName),
    location: locationFromTitle(card.title),
    image_url: detail?.image || card.image,
    date_listed: card.date,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// href : /{ville}/lost/{espèce}/rl{id}  ou  /lost/{espèce}/rl{id}
function speciesFromHref(href) {
  const m = href.match(/\/(?:lost|found)\/([a-z]+)\//i);
  return normalizeSpecies(m ? m[1] : null);
}

function idFromHref(href) {
  const m = href.match(/(r[lf]\d+)/i);
  return m ? m[1] : href;
}

// "Пропала собака, Село Зональное..." -> "Село Зональное"
function locationFromTitle(title) {
  if (!title) return null;
  const idx = title.indexOf(',');
  if (idx === -1) return null;
  return clean(title.slice(idx + 1).replace(/\.+$/, ''));
}

// "чт, 28.05.2026" -> "2026-05-28"
function parseRuDate(text) {
  const m = clean(text)?.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
