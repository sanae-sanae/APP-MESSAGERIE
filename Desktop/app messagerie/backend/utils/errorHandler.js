const errorHandler = (err, req, res, next) => {
    // Déterminer le code de statut de l'erreur
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode);

    res.json({
        message: err.message,
        // En mode développement, inclure la stack trace pour le débogage
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

// Middleware pour les routes non trouvées (404)
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error); // Passer l'erreur au gestionnaire d'erreurs global
};

module.exports = {
    errorHandler,
    notFound
};