// Point d'entrée principal — charge les styles globaux et initialise le shell
import '../scss/main.scss';
import { initNav } from './nav.js';
import { initAuthWidget } from './auth-widget.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initAuthWidget();
});
