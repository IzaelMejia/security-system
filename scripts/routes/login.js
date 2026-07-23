const express = require('express');
const router = express.Router();
const connection = require('../db');
const bcrypt = require('bcryptjs');

router.post('/', (req, res) => {
  const correo = req.body.username;
  const contrasena = req.body.password;

  // Validación de campos vacíos
  if (!correo || !contrasena) {
    console.log('Campos de inicio de sesión incompletos');
    res.redirect('/');
    return;
  }

  // Buscar el administrador por su correo
  connection.query(
    'CALL sp_ObtenerAdministradorPorCorreo(?)',
    [correo],
    async (error, results) => {
      if (error) {
        console.error('Error al consultar el usuario:', error);
        res.status(500).send('Error interno al validar inicio de sesión');
        return;
      }
      
      const administrador = results && results[0] && results[0][0];
      if (administrador) {
        try {
          // Comparar la contraseña ingresada con el hash de la base de datos (con fallback a texto plano)
          const coincide = (await bcrypt.compare(contrasena, administrador.adm_contrasena)) || (contrasena === administrador.adm_contrasena);
          if (coincide) {
            // Guardar datos en la sesión
            req.session.usuario = {
              id: administrador.adm_id,
              nombre: administrador.adm_nombre,
              correo: administrador.adm_correo
            };
            console.log('Inicio de sesión exitoso:', correo);
            res.redirect('/inicio');
          } else {
            console.log('Credenciales incorrectas (contraseña no coincide) para:', correo);
            res.redirect('/');
          }
        } catch (err) {
          console.error('Error al comparar contraseñas:', err);
          res.status(500).send('Error interno en el servidor');
        }
      } else {
        console.log('Credenciales incorrectas (usuario no encontrado):', correo);
        res.redirect('/');
      }
    }
  );
});

module.exports = router;
