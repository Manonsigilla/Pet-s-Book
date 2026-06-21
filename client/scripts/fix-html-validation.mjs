/**
 * Script de correction des erreurs de validation HTML W3C.
 * Corrige les catégories d'erreurs dans toutes les pages HTML source.
 *
 * Exécution : node scripts/fix-html-validation.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function getHTMLFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    if (entry.isDirectory()) {
      files.push(...getHTMLFiles(full));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const files = getHTMLFiles(ROOT);
console.log(`Fichiers trouvés : ${files.length}`);

const VOID_ELEMENTS = [
  'meta', 'link', 'source', 'img', 'input', 'br', 'track',
  'hr', 'area', 'base', 'col', 'embed', 'wbr'
];

let totalFixes = 0;

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  let fixes = 0;

  // ── 1. void-style : remplacer /> par > sur les éléments vides ──
  for (const tag of VOID_ELEMENTS) {
    const selfClosing = new RegExp(`<${tag}(\\s[^>]*?)\\s*/>`, 'gi');
    const count = (html.match(selfClosing) || []).length;
    if (count > 0) {
      html = html.replace(selfClosing, (_, attrs) => `<${tag}${attrs}>`);
      fixes += count;
    }
    const bare = new RegExp(`<${tag}\\s*/>`, 'gi');
    const bareCount = (html.match(bare) || []).length;
    if (bareCount > 0) {
      html = html.replace(bare, `<${tag}>`);
      fixes += bareCount;
    }
  }

  // ── 2. aria-label sur <div> sans role → ajouter role="region" ──
  const divAriaLabel = /<div\s+([^>]*?)aria-label="([^"]*)"([^>]*)>/gi;
  const divAriaLabelCount = (html.match(divAriaLabel) || []).length;
  if (divAriaLabelCount > 0) {
    html = html.replace(divAriaLabel, (match, before, labelText, after) => {
      if (before.includes('role=') || after.includes('role=')) return match;
      return `<div ${before}role="region" aria-label="${labelText}"${after}>`;
    });
    fixes += divAriaLabelCount;
  }

  // ── 3. <div role="region"> → <section> (prefer-native-element) ──
  // Le validateur préfère <section> à <div role="region">
  // Cible les divs avec role="region" qui sont auto-fermantes
  const divRegion = /<div\s+([^>]*?\brole="region"[^>]*?)><\/div>/gi;
  const divRegionCount = (html.match(divRegion) || []).length;
  if (divRegionCount > 0) {
    html = html.replace(divRegion, (_, attrs) => {
      // Retire role="region" puisqu'un <section> a ce rôle implicite
      const cleanAttrs = attrs.replace(/\s*role="region"\s*/, ' ').replace(/\s+/, ' ').trim();
      return `<section ${cleanAttrs}></section>`;
    });
    fixes += divRegionCount;
  }

  // ── 4. aria-hidden="true" sur les modales → utiliser hidden ──
  // Cas 1 : role="dialog" ... aria-hidden="true"
  const modalPattern1 = /(<div[^>]*\brole="dialog"[^>]*)\baria-hidden="true"([^>]*>)/gi;
  const c1 = (html.match(modalPattern1) || []).length;
  if (c1 > 0) {
    html = html.replace(modalPattern1, '$1hidden$2');
    fixes += c1;
  }

  // Cas 2 : aria-hidden="true" ... role="dialog" (ordre inverse)
  const modalPattern2 = /<div\b([^>]*?)\baria-hidden="true"([^>]*?\brole="dialog"[^>]*?)>/gi;
  const c2 = (html.match(modalPattern2) || []).length;
  if (c2 > 0) {
    html = html.replace(modalPattern2, (_, beforeAfter, rest) => {
      // Enlever aria-hidden="true", ajouter hidden
      const cleanBefore = beforeAfter.replace(/\s*aria-hidden="true"\s*/, ' ').replace(/\s+/, ' ').trim();
      return `<div ${cleanBefore}${rest} hidden>`;
    });
    fixes += c2;
  }

  // Cas 3 : aria-hidden="true" sur un div.modal sans role="dialog"
  // (backup au cas où, mais ne devrait pas arriver)
  const modalPattern3 = /<div\b([^>]*?\bclass="[^"]*modal[^"]*"[^>]*?)\baria-hidden="true"([^>]*?)>/gi;
  const c3 = (html.match(modalPattern3) || []).length;
  if (c3 > 0) {
    html = html.replace(modalPattern3, '<div$1hidden$2>');
    fixes += c3;
  }

  if (fixes > 0) {
    writeFileSync(file, html, 'utf8');
    console.log(`✅ ${file.replace(ROOT + '/', '')} : ${fixes} corrections`);
    totalFixes += fixes;
  } else {
    console.log(`   ${file.replace(ROOT + '/', '')} : déjà propre`);
  }
}

console.log(`\n🎯 Total : ${totalFixes} corrections dans ${files.length} fichiers`);
console.log('\n⚠️  Pense à relancer "npm run build" dans client/ pour regénérer le dist.');
