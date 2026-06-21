import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

const files = readdirSync(DIST, { recursive: true }).filter(f => f.endsWith('.html'));

console.log(`🔍 Validation W3C de ${files.length} fichiers...\n`);

let totalErrors = 0;
let totalWarnings = 0;

for (const file of files) {
  const html = readFileSync(join(DIST, file), 'utf8');

  try {
    const res = await fetch('https://validator.w3.org/nu/?out=json', {
      method: 'POST',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html,
    });

    if (!res.ok) {
      console.log(`⚠️  ${file}: API error ${res.status}`);
      continue;
    }

    const result = await res.json();
    const errors = result.messages?.filter(m => m.type === 'error') ?? [];
    const warnings = result.messages?.filter(m => m.type === 'info' && m.subtype === 'warning') ?? [];

    if (errors.length === 0 && warnings.length === 0) {
      console.log(`✅ ${file}`);
    } else {
      if (errors.length > 0) {
        console.log(`❌ ${file}: ${errors.length} erreur(s)`);
        for (const e of errors) {
          console.log(`   L${e.lastLine}: ${e.message}`);
        }
      }
      if (warnings.length > 0) {
        console.log(`⚠️  ${file}: ${warnings.length} avertissement(s)`);
        for (const w of warnings) {
          console.log(`   L${w.lastLine}: ${w.message}`);
        }
      }
    }

    totalErrors += errors.length;
    totalWarnings += warnings.length;

    // Rate-limit : l'API W3C demande ~1 requête par seconde
    await new Promise(r => setTimeout(r, 1500));
  } catch (err) {
    console.log(`💥 ${file}: ${err.message}`);
  }
}

console.log(`\n📊 Bilan : ${totalErrors} erreur(s), ${totalWarnings} avertissement(s) sur ${files.length} fichiers`);
console.log(totalErrors === 0 ? '🎉 Tout est valide W3C !' : '🔧 Il reste des corrections à faire.');
