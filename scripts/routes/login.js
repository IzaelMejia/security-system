const express = require('express');
const path = require('path'); // Importa el módulo 'path'
const router = express.Router();
const connection = require('../db');

router.post('/', (req, res) => {
  // Controlador para el inicio de sesión
  const correo = req.body.username;
  const contrasena = req.body.password;

  connection.query(
    'CALL validar_inicio_sesion(?, ?)',
    [correo, contrasena],
    (error, results) => {
      if (error) {
        console.error(error); // Registra el error en la consola del servidor
        res.status(500).send('Error al validar inicio de sesión');
      } else {
        const mensaje = results[0][0];
        if (mensaje && mensaje.mensaje === 'Inicio Exitoso') {
          console.log('Credenciales recibidas:', correo, contrasena);
          res.redirect('/inicio');
        } else {
          console.log('Error al ingresar');
          res.redirect('/');
        }
      }
    }
  );
});

module.exports = router;
