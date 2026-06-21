import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const files = ['copains.html', 'creer-profil.html'];

for (const file of files) {
  const html = readFileSync(join(DIST, file), 'utf8');
  const res = await fetch('https://validator.w3.org/nu/?out=json', {
    method: 'POST',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html,
  });
  const result = await res.json();
  const errors = result.messages?.filter(m => m.type === 'error') ?? [];
  const warnings = result.messages?.filter(m => m.type === 'info' && m.subtype === 'warning') ?? [];
  console.log(errors.length === 0 ? `✅ ${file}` : `❌ ${file}: ${errors.length} erreur(s)`);
  if (errors.length > 0) errors.forEach(e => console.log(`   L${e.lastLine}: ${e.message}`));
}
