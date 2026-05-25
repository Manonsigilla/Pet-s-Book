// Gestion du menu burger mobile + état actif de la page courante
export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      nav.setAttribute('data-open', String(!isOpen));
      document.body.style.overflow = !isOpen ? 'hidden' : '';
    });
  }

  // Marque le lien correspondant à la page courante
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.endsWith(currentPath)) {
      link.setAttribute('aria-current', 'page');
    }
  });
}
