const express = require('express');
const router = express.Router();
const connection = require('../db');

router.post('/', (req, res) => {
  // Controlador para el inicio de sesión
    const usuario = req.body.username;
    const contrasena = req.body.password;
  
    console.log('Credenciales recibidas:', usuario, contrasena);
    
    connection.query(
      'CALL validar_inicio_sesion(?, ?)',
      [usuario, contrasena],
      (error, results) => {
        if (error) {
          console.error('Error al validar inicio de sesión:', error);
          res.send('Error al validar inicio de sesión');
        } else {
          const mensaje = results[0][0].mensaje;
          res.status(200).send(mensaje);
        }
      }
    );
  });

module.exports = router;
