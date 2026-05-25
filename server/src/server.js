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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/animals', animalsRoutes);
app.use('/api/lost', lostRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/products', productsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Pet's Book API à l'écoute sur http://localhost:${PORT}`);
});
