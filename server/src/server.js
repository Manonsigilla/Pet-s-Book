import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import animalsRoutes from './routes/animals.js';
import lostRoutes from './routes/lost.js';
import eventsRoutes from './routes/events.js';
import productsRoutes from './routes/products.js';
import messagesRoutes from './routes/messages.js';
import listingsRoutes from './routes/listings.js';
import ordersRoutes from './routes/orders.js';
import conversationsRoutes from './routes/conversations.js';
import friendsRoutes from './routes/friends.js';
import postsRoutes from './routes/posts.js';
import { UPLOAD_DIR } from './lib/upload.js';
import { notFoundHandler, errorHandler } from './middlewares/error.js';

// Vérifie au démarrage que les secrets sont configurés.
function assertSecrets() {
  const required = ['PASSWORD_PEPPER', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key] || process.env[key].length < 32);
  if (missing.length > 0) {
    console.error(`[server] Variables manquantes ou trop courtes : ${missing.join(', ')}`);
    console.error('[server] Copie server/.env.example vers server/.env et génère des secrets robustes.');
    process.exit(1);
  }
}
assertSecrets();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: false,
}));
app.use(express.json({ limit: '1mb' }));

// Limite les tentatives d'authentification pour éviter le brute-force.
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
// Limite l'envoi de messages publics pour éviter le spam.
app.use('/api/messages', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/animals', animalsRoutes);
app.use('/api/lost', lostRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/posts', postsRoutes);

// Photos d'annonces téléversées par les utilisateurs (cache 7 jours).
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Pet's Book API à l'écoute sur http://localhost:${PORT}`);
});
