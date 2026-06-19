// Affichages d'erreur accessibles (WCAG AA) en remplacement des alert() natifs.
// showError()  → notification temporaire avec role="alert"
// showConfirm() → boîte de dialogue modale avec role="alertdialog" (remplace confirm())

/**
 * Affiche une erreur temporaire à côté d'un élément, avec role="alert".
 * Le message est retiré automatiquement après 8 secondes.
 *
 * @param {Element|string} anchor - Élément à côté duquel afficher l'erreur, ou sélecteur CSS.
 * @param {string} message - Message d'erreur (échappé automatiquement).
 */
export function showError(anchor, message) {
  const el = typeof anchor === 'string' ? document.querySelector(anchor) : anchor;
  if (!el) return;

  // Supprime toute erreur existante
  const existing = document.querySelector('.error-display');
  if (existing) existing.remove();

  const error = document.createElement('div');
  error.className = 'error-display auth-feedback auth-feedback--error';
  error.setAttribute('role', 'alert');
  error.textContent = message;

  // Insère après l'élément, ou à la fin de son parent si l'élément n'a pas de nextSibling
  el.parentNode?.insertBefore(error, el.nextSibling);

  // Auto-suppression après 8 secondes
  setTimeout(() => {
    if (error.isConnected) error.remove();
  }, 8000);
}

/**
 * Boîte de dialogue de confirmation accessible (remplace window.confirm()).
 * Piège le focus, supporte Échap pour Annuler, retourne une promesse.
 *
 * @param {string} message - Message à afficher.
 * @param {string} [confirmLabel='Confirmer'] - Texte du bouton de confirmation.
 * @param {string} [cancelLabel='Annuler'] - Texte du bouton d'annulation.
 * @returns {Promise<boolean>} true si confirmé, false si annulé.
 */
export function showConfirm(message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler') {
  return new Promise((resolve) => {
    // Nettoie un éventuel dialogue précédent
    const existing = document.querySelector('.confirm-overlay');
    if (existing) existing.remove();

    // Fond semi-transparent
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    // Dialogue
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirm-message');

    dialog.innerHTML = `
      <p id="confirm-message">${message}</p>
      <div class="confirm-dialog__actions">
        <button type="button" class="btn btn--ghost confirm-cancel">${cancelLabel}</button>
        <button type="button" class="btn btn--primary confirm-ok">${confirmLabel}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const okBtn = dialog.querySelector('.confirm-ok');
    const cancelBtn = dialog.querySelector('.confirm-cancel');

    // Focus le bouton le moins destructif par défaut (Annuler)
    cancelBtn.focus();

    function cleanup(value) {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    }

    okBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(false); }
      // Piège le focus dans le dialogue (Tab / Shift+Tab)
      if (e.key === 'Tab') {
        const focusable = [cancelBtn, okBtn];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
  });
}
