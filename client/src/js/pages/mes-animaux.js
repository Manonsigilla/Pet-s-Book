// Page Mes animaux — les profils du membre, avec score de protection et gestion.
import '../main.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { escapeHtml, speciesLine, tagsHtml, gaugeHtml } from '../animal-view.js';

if (!auth.isAuthenticated()) {
  window.location.replace(`/login.html?redirect=${encodeURIComponent('/mes-animaux.html')}`);
}

const container = document.getElementById('mes-animaux-list');

function render(animals) {
  container.setAttribute('aria-busy', 'false');

  if (animals.length === 0) {
    container.innerHTML = `
      <div class="state">
        <h2 class="state__title">Aucun profil pour le moment</h2>
        <p class="state__text">
          Votre compagnon mérite sa place dans la communauté ! Créez son profil,
          faites grimper son score de protection et trouvez-lui des copains.
        </p>
        <p><a class="btn btn--primary" href="/creer-profil.html"><i class="fa-solid fa-paw" aria-hidden="true"></i> Créer son premier profil</a></p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid-cards">
      ${animals.map((animal) => `
        <article class="card">
          <img
            class="card__media"
            src="${escapeHtml(animal.imageUrl || '/placeholder-pet.svg')}"
            alt="Photo de ${escapeHtml(animal.name)}"
            loading="lazy"
          />
          <div class="card__body">
            ${tagsHtml(animal)}
            <h2 class="card__title">${escapeHtml(animal.name)}</h2>
            <p class="card__meta">${escapeHtml(speciesLine(animal))}</p>
            ${gaugeHtml(animal)}
            <div class="card__footer">
              <a class="btn btn--ghost" href="/profil-detail.html?id=${animal.id}">Voir le profil</a>
              <button class="btn btn--ghost btn--small" data-action="settings" data-id="${animal.id}"
                data-visibility="${escapeHtml(animal.visibility || 'private')}"
                data-friend-policy="${escapeHtml(animal.friendPolicy || 'everyone')}"><i class="fa-solid fa-gear" aria-hidden="true"></i> Paramètres</button>
              <button class="btn btn--danger btn--small" data-action="delete" data-id="${animal.id}">Supprimer</button>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

async function load() {
  container.setAttribute('aria-busy', 'true');
  try {
    render(await api.get('/animals/mine'));
  } catch (err) {
    container.innerHTML = `
      <div class="state state--error" role="alert">
        <p class="state__text">${escapeHtml(err.message || 'Erreur de chargement.')}</p>
      </div>
    `;
  }
}

// -----------------------------------------------------------------------------
// Modal des paramètres (visibilité + qui peut ajouter en copain)
// -----------------------------------------------------------------------------
const modal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const settingsFeedback = document.getElementById('settings-feedback');

function openSettings(button) {
  document.getElementById('settings-animal-id').value = button.dataset.id;
  document.getElementById('settings-visibility').value = button.dataset.visibility;
  document.getElementById('settings-friend-policy').value = button.dataset.friendPolicy;
  settingsFeedback.textContent = '';
  modal.setAttribute('data-open', 'true');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  modal.setAttribute('data-open', 'false');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.getElementById('close-settings').addEventListener('click', closeSettings);
modal.addEventListener('click', (event) => { if (event.target === modal) closeSettings(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.getAttribute('data-open') === 'true') closeSettings();
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.getElementById('settings-animal-id').value;
  const submit = document.getElementById('settings-submit');
  submit.disabled = true;
  try {
    await api.put(`/animals/${id}/settings`, {
      visibility: document.getElementById('settings-visibility').value,
      friendPolicy: document.getElementById('settings-friend-policy').value,
    });
    closeSettings();
    await load();
  } catch (err) {
    settingsFeedback.textContent = err.message || 'Erreur lors de l\'enregistrement.';
    settingsFeedback.className = 'auth-feedback auth-feedback--error';
  } finally {
    submit.disabled = false;
  }
});

// -----------------------------------------------------------------------------
// Actions des cartes
// -----------------------------------------------------------------------------
container.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  if (button.dataset.action === 'settings') {
    openSettings(button);
    return;
  }

  if (button.dataset.action === 'delete') {
    if (!confirm('Supprimer définitivement ce profil ? Ses amitiés seront perdues.')) return;
    button.disabled = true;
    try {
      await api.delete(`/animals/${button.dataset.id}`);
      await load();
    } catch (err) {
      alert(`Erreur : ${err.message}`);
      button.disabled = false;
    }
  }
});

load();
