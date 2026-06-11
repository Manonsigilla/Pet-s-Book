// Page Suggestions / Plaintes — formulaire branché sur l'API publique POST /messages.
import '../main.js';
import { setupMessageForm } from '../message-form.js';

setupMessageForm({
  formId: 'suggestions-form',
  defaultType: 'suggestion',
  successMessage: 'Merci ! Votre message a bien été transmis à notre équipe.',
});
