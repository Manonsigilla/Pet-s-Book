import { defineConfig } from 'vite';
import { resolve } from 'path';

// Ajoute ici les nouvelles pages au fur et à mesure de leur création :
// chaque clé devient le nom du chunk, chaque valeur pointe vers le fichier HTML.
const pages = {
  main:            resolve(__dirname, 'index.html'),
  apropos:         resolve(__dirname, 'apropos.html'),
  profils:         resolve(__dirname, 'profils.html'),
  profilDetail:    resolve(__dirname, 'profil-detail.html'),
  creerProfil:     resolve(__dirname, 'creer-profil.html'),
  copains:         resolve(__dirname, 'copains.html'),
  mesAnimaux:      resolve(__dirname, 'mes-animaux.html'),
  login:           resolve(__dirname, 'login.html'),
  register:        resolve(__dirname, 'register.html'),
  admin:           resolve(__dirname, 'admin.html'),
  perdusRetrouves: resolve(__dirname, 'perdus-retrouves.html'),
  evenements:      resolve(__dirname, 'evenements.html'),
  petsshop:        resolve(__dirname, 'petsshop.html'),
  vendre:          resolve(__dirname, 'vendre.html'),
  annonce:         resolve(__dirname, 'annonce.html'),
  mesVentes:       resolve(__dirname, 'mes-ventes.html'),
  messagesPage:    resolve(__dirname, 'messages.html'),
  contact:         resolve(__dirname, 'contact.html'),
  suggestions:     resolve(__dirname, 'suggestions-plaintes.html'),
  mentionsLegales: resolve(__dirname, 'mentions-legales.html'),
  conditionsGenerales: resolve(__dirname, 'conditions-generales.html'),
  page404:         resolve(__dirname, '404.html'),
};

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Photos d'annonces servies par le back-end.
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: pages,
    },
  },
});
