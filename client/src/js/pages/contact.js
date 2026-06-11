// Page Contact — formulaire branché sur l'API publique POST /messages.
import '../main.js';
import { setupMessageForm } from '../message-form.js';

setupMessageForm({
  formId: 'contact-form',
  defaultType: 'contact',
  successMessage: 'Message envoyé ! Merci, nous reviendrons vers vous rapidement.',
});
