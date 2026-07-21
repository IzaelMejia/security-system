// Middleware para verificar la sesión del usuario
module.exports = {
  requiereAutenticacion: function (req, res, next) {
    if (req.session && req.session.usuario) {
      return next();
    }
    // Si no está autenticado, redirige al login
    res.redirect('/');
  },
  
  requiereAutenticacionAPI: function (req, res, next) {
    if (req.session && req.session.usuario) {
      return next();
    }
    // Si es un endpoint API, responde con un código de estado 401
    res.status(401).json({ error: 'No autorizado' });
  }
};
