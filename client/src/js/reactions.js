// Barre de réactions emoji sous une publication. Emojis volontaires (pas de
// librairie d'icônes). Un état local par post permet une mise à jour optimiste
// sans recharger tout le feed.
import { api } from './api.js';

export const REACTION_EMOJIS = ['❤️', '😂', '😮', '🥰', '👏', '🐾'];

// postId -> { counts: { emoji: n }, mine: emoji | null }
const state = new Map();

function barInner(postId) {
  const s = state.get(postId) || { counts: {}, mine: null };
  return REACTION_EMOJIS.map((emoji) => {
    const n = s.counts[emoji] || 0;
    const mine = s.mine === emoji;
    return `<button type="button" class="reaction${mine ? ' reaction--mine' : ''}" data-emoji="${emoji}" aria-pressed="${mine}" aria-label="Réagir ${emoji}">
      <span class="reaction__emoji">${emoji}</span>${n ? `<span class="reaction__count">${n}</span>` : ''}
    </button>`;
  }).join('');
}

// HTML initial de la barre pour un post (mémorise aussi son état courant).
export function reactionBarHtml(post) {
  state.set(post.id, { counts: { ...(post.reactions || {}) }, mine: post.myReaction || null });
  return `<div class="reactions" data-post-id="${post.id}">${barInner(post.id)}</div>`;
}

// À appeler une fois par conteneur : délégation des clics (idempotent).
export function bindReactions(container) {
  if (!container || container.dataset.reactionsBound === 'true') return;
  container.dataset.reactionsBound = 'true';

  container.addEventListener('click', async (event) => {
    const btn = event.target.closest('.reaction');
    if (!btn) return;
    const bar = btn.closest('.reactions');
    const postId = Number(bar?.dataset.postId);
    const s = state.get(postId);
    if (!s) return;

    const emoji = btn.dataset.emoji;
    const removing = s.mine === emoji;

    // Mise à jour optimiste : retirer l'ancienne réaction, poser la nouvelle.
    if (s.mine) s.counts[s.mine] = Math.max(0, (s.counts[s.mine] || 0) - 1);
    s.mine = removing ? null : emoji;
    if (!removing) s.counts[emoji] = (s.counts[emoji] || 0) + 1;
    bar.innerHTML = barInner(postId);

    try {
      if (removing) await api.delete(`/posts/${postId}/react`);
      else await api.post(`/posts/${postId}/react`, { emoji });
    } catch {
      // Échec réseau : l'état optimiste reste affiché ; un rechargement resync.
    }
  });
}
