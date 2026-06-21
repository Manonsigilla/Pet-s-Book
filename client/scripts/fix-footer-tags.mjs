/**
 * Correction rapide des balises h2/h3 mal formées dans le footer.
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
let total = 0;

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  let fixes = 0;

  // Corriger les balises mal formées <h2>XXX</h3> → <h2>XXX</h2>
  const patterns = ['Services', 'Informations', 'Suivez-nous', 'Moyens de paiement'];
  for (const text of patterns) {
    const malformed = `<h2>${text}</h3>`;
    const correct = `<h2>${text}</h2>`;
    if (html.includes(malformed)) {
      html = html.replace(malformed, correct);
      fixes++;
    }
  }

  if (fixes > 0) {
    writeFileSync(file, html, 'utf8');
    console.log(`✅ ${file.replace(ROOT + '/', '')} : ${fixes} fixes`);
    total += fixes;
  }
}

console.log(`\n🎯 Total : ${total} balises fermantes corrigées`);
