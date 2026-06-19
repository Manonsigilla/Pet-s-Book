// Optimise les images du site : convertit JPG/PNG → WebP + AVIF.
// Usage : node scripts/optimize-images.mjs
import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'public', 'images');

const WEBP_QUALITY = 80;
const AVIF_QUALITY = 60;
const MAX_WIDTH = 1920;

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function optimizeFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.svg') return null; // skip SVG

  const baseName = filePath.slice(0, -ext.length);
  const webpPath = baseName + '.webp';
  const avifPath = baseName + '.avif';

  const originalStats = await stat(filePath);
  const originalSize = originalStats.size;

  // Redimensionne si trop large, sinon garde tel quel
  const pipeline = sharp(filePath);
  const metadata = await pipeline.metadata();
  if (metadata.width > MAX_WIDTH) {
    pipeline.resize(MAX_WIDTH);
  }

  // WebP
  await pipeline
    .clone()
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toFile(webpPath);

  // AVIF
  await pipeline
    .clone()
    .avif({ quality: AVIF_QUALITY, effort: 6 })
    .toFile(avifPath);

  const webpStats = await stat(webpPath);
  const avifStats = await stat(avifPath);
  const webpSize = webpStats.size;
  const avifSize = avifStats.size;

  return {
    file: filePath,
    originalSize,
    webpSize,
    avifSize,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  };
}

async function main() {
  console.log('🔍 Scan des images dans', IMAGES_DIR);
  const results = [];

  for await (const filePath of walk(IMAGES_DIR)) {
    const ext = extname(filePath).toLowerCase();
    const baseName = filePath.slice(0, -ext.length);

    // Skip si déjà optimisé (présence du .webp correspondant)
    // mais seulement si c'est un JPG/PNG original
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      console.log(`  → ${filePath.replace(IMAGES_DIR, '')}`);
      const result = await optimizeFile(filePath);
      if (result) results.push(result);
    }
  }

  // Résumé
  const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
  const totalWebp = results.reduce((s, r) => s + r.webpSize, 0);
  const totalAvif = results.reduce((s, r) => s + r.avifSize, 0);

  console.log('\n📊 Résumé :');
  console.log(`  Fichiers optimisés  : ${results.length}`);
  console.log(`  Poids original      : ${(totalOriginal / 1024).toFixed(1)} Ko`);
  console.log(`  Poids WebP          : ${(totalWebp / 1024).toFixed(1)} Ko (${((100 * totalWebp) / totalOriginal).toFixed(0)}%)`);
  console.log(`  Poids AVIF          : ${(totalAvif / 1024).toFixed(1)} Ko (${((100 * totalAvif) / totalOriginal).toFixed(0)}%)`);
  console.log(`  Gain WebP           : ${((100 * (totalOriginal - totalWebp)) / totalOriginal).toFixed(0)}%`);
  console.log(`  Gain AVIF           : ${((100 * (totalOriginal - totalAvif)) / totalOriginal).toFixed(0)}%`);

  // Exporte les dimensions pour le script HTML
  console.log('\n📐 Dimensions des images :');
  for (const r of results) {
    const rel = r.file.replace(IMAGES_DIR, '').replace(/\\/g, '/');
    console.log(`  ${rel}: ${r.width}x${r.height}`);
  }
}

main().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});
