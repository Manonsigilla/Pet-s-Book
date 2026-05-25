# Actifs médias — Pet's Book

Ce dossier contient les fichiers audio et vidéo importés sur le site.

## Fichiers attendus

| Fichier | Statut | Description |
|---|---|---|
| `welcome.wav` | ✅ présent | Carillon de bienvenue joué sur la page d'accueil (placeholder, à remplacer par un son plus thématique). |
| `intro.mp4` | ⏳ à fournir | Vidéo de présentation diffusée sur la page d'accueil. Format MP4 H.264, max 10 Mo recommandé. |

## Où trouver des fichiers libres de droits

- [Pixabay](https://pixabay.com/videos/) — vidéos CC0
- [Pexels](https://www.pexels.com/videos/) — vidéos gratuites
- [Mixkit](https://mixkit.co/free-stock-video/) — vidéos courtes
- [Freesound](https://freesound.org/) — sons CC

## Bonnes pratiques (éco-conception, grille RNCP)

- Compresser les vidéos en H.264 + audio AAC, max **1080p / 2 Mbps** pour une présentation web
- Toujours fournir un `poster` (image fixe) sur les `<video>` pour éviter de télécharger la vidéo si l'utilisateur ne joue pas
- Ne **jamais** mettre `autoplay` sans `muted` (le navigateur bloque)
- Préférer `preload="metadata"` plutôt que `preload="auto"` (économise la bande passante)
