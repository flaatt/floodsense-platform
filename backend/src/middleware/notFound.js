function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: `Route introuvable: ${req.method} ${req.originalUrl}`,
    hint: 'Consultez /health pour vérifier que le serveur est opérationnel'
  });
}
module.exports = { notFound };
