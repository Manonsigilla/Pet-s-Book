import { defineConfig } from 'vite';
import { resolve } from 'path';

// Ajoute ici les nouvelles pages au fur et à mesure de leur création :
// chaque clé devient le nom du chunk, chaque valeur pointe vers le fichier HTML.
const pages = {
  main:            resolve(__dirname, 'index.html'),
  profils:         resolve(__dirname, 'profils.html'),
  profilDetail:    resolve(__dirname, 'profil-detail.html'),
  login:           resolve(__dirname, 'login.html'),
  register:        resolve(__dirname, 'register.html'),
  admin:           resolve(__dirname, 'admin.html'),
  perdusRetrouves: resolve(__dirname, 'perdus-retrouves.html'),
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
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: pages,
    },
  },
});
