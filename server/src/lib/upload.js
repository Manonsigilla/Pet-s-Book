// Upload de photos d'annonces via multer.
// Les fichiers sont stockés dans server/uploads/ (gitignoré) et servis
// statiquement sur /uploads. Seules les images sont acceptées (5 Mo max, 3 par annonce).

import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = resolve(__dirname, '..', '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename(req, file, cb) {
    // Nom aléatoire : on ne fait jamais confiance au nom de fichier du client.
    const ext = ALLOWED_TYPES.get(file.mimetype) ?? extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return cb(new Error('Format d\'image non supporté (JPEG, PNG, WebP ou AVIF uniquement).'));
  }
  cb(null, true);
};

// Annonces du marketplace : jusqu'à 3 photos (champ « photos »).
export const uploadListingPhotos = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: imageFilter,
}).array('photos', 3);

// Photo de profil d'un animal : une seule image (champ « photo »).
export const uploadProfilePhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: imageFilter,
}).single('photo');

// Photo d'un signalement perdu/trouvé : une seule image (champ « photo »).
export const uploadReportPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: imageFilter,
}).single('photo');
