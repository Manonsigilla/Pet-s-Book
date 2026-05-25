// Middleware central de gestion des erreurs : évite de fuiter la stack en prod.
export function notFoundHandler(req, res, next) {
  res.status(404).json({ message: 'Ressource introuvable' });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Erreur serveur'
    : err.message;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({ message });
}
