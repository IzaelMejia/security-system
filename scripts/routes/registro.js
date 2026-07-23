const express = require('express');
const router = express.Router();
const connection = require('../db');
const bcrypt = require('bcryptjs');

router.post('/registro', async (req, res) => {
  const nombre = req.body.name;
  const correo = req.body.email;
  const contrasena = req.body.password;

  if (!nombre || !correo || !contrasena) {
    console.log('Campos incompletos en el registro');
    res.redirect('/registro');
    return;
  }

  try {
    // Hashear la contraseña antes de guardarla en la base de datos
    const saltRounds = 10;
    const contrasenaEncriptada = await bcrypt.hash(contrasena, saltRounds);

    connection.query(
      'CALL sp_InsAdministrador(?, ?, ?)',
      [nombre, correo, contrasenaEncriptada],
      (error, results) => {
        if (error) {
          console.error('Error al registrar administrador:', error);
          res.status(500).send('Error interno al realizar el registro');
          return;
        }
        
        const resultado = results && results[0] && results[0][0];
        if (resultado && resultado.resultado === 'Registro Exitoso') {
          console.log('Administrador registrado con éxito:', correo);
          res.redirect('/');
        } else {
          console.log('Error al registrar en la BD:', resultado ? resultado.resultado : 'Respuesta vacía');
          res.redirect('/registro');
        }
      }
    );
  } catch (err) {
    console.error('Error al procesar el registro:', err);
    res.status(500).send('Error interno en el servidor');
  }
});

module.exports = router;
