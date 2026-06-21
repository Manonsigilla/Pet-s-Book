/**
 * Validation CSS via l'API officielle W3C (Jigsaw).
 * Exécution : node scripts/validate-css.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist', 'assets');

const cssFiles = readdirSync(DIST).filter(f => f.endsWith('.css'));

if (cssFiles.length === 0) {
  console.log('❌ Aucun fichier CSS trouvé dans dist/assets/. Lance "npm run build" d\'abord.');
  process.exit(1);
}

console.log(`🔍 Validation W3C CSS — ${cssFiles.length} fichier(s)\n`);

let totalErrors = 0;
let totalWarnings = 0;

for (const file of cssFiles) {
  const css = readFileSync(join(DIST, file), 'utf8');
  console.log(`📄 ${file} (${(css.length / 1024).toFixed(1)} Ko)`);

  try {
    // Upload multipart (le paramètre "text" est limité en taille)
    const formData = new FormData();
    formData.append('file', new Blob([css], { type: 'text/css' }), file);
    formData.append('output', 'json');
    formData.append('profile', 'css3svg');
    formData.append('warning', '2');

    const res = await fetch('https://jigsaw.w3.org/css-validator/validator', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.log(`⚠️  ${file}: API error ${res.status}`);
      continue;
    }

    const result = await res.json();
    const cssValidation = result.cssvalidation ?? result;
    const errors = cssValidation.errors ?? [];
    const warnings = cssValidation.warnings ?? [];

    if (errors.length === 0 && warnings.length === 0) {
      console.log(`✅ CSS valide — aucune erreur\n`);
    } else {
      if (errors.length > 0) {
        console.log(`❌ ${errors.length} erreur(s) :`);
        for (const e of errors) {
          console.log(`   L${e.line}: ${e.message}`);
        }
      }
      if (warnings.length > 0) {
        console.log(`⚠️  ${warnings.length} avertissement(s) :`);
        for (const w of warnings) {
          console.log(`   L${w.line}: ${w.message}`);
        }
      }
      console.log();
    }

    totalErrors += errors.length;
    totalWarnings += warnings.length;
  } catch (err) {
    console.log(`💥 ${file}: ${err.message}\n`);
  }
}

console.log(`📊 Bilan : ${totalErrors} erreur(s), ${totalWarnings} avertissement(s)`);
console.log(totalErrors === 0 ? '🎉 CSS valide W3C !' : '🔧 Il reste des corrections à faire.');
