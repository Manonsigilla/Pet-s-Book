/**
 * Script de correction des erreurs W3C spécifiques.
 * Exécution : node scripts/fix-w3c.mjs
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
    if (entry.isDirectory()) files.push(...getHTMLFiles(full));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const files = getHTMLFiles(ROOT);
console.log(`Fichiers trouvés : ${files.length}\n`);

let totalFixes = 0;

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  let fixes = 0;

  // ── 1. Footer : <h3> → <h2> (heading skip h1→h3) ──
  // Le validateur W3C signale un saut de niveau quand la page
  // n'a pas de <h2> avant les <h3> du footer.
  const footerH3 = [
    '<h3>Services</h3>',
    '<h3>Informations</h3>',
    '<h3>Suivez-nous</h3>',
    '<h3>Moyens de paiement</h3>',
  ];
  for (const h3 of footerH3) {
    if (html.includes(h3)) {
      const h2 = h3.replace('h3', 'h2');
      html = html.replace(h3, h2);
      fixes++;
    }
  }

  if (fixes > 0) {
    writeFileSync(file, html, 'utf8');
    console.log(`✅ ${file.replace(ROOT + '/', '')} : ${fixes} corrections`);
    totalFixes += fixes;
  }
}

console.log(`\n🎯 Total footer : ${totalFixes} corrections`);
