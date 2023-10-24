const express = require('express');
const router = express.Router();
const connection = require('../db');

router.post('/registro', (req, res) => {
// Envío de datos al procedimiento almacenado a la Base de datos
    const nombre = req.body.name;
    const correo = req.body.email;
    const contrasena = req.body.password;
  
    console.log('Datos recibidos del formulario:', nombre, correo, contrasena);
    
    connection.query(
      'CALL sp_InsAdministrador(?, ?, ?)',
      [nombre, correo, contrasena],
      (error, results) => {
        if (error) {
          console.error('Error al registrar el usuario:', error);
          res.send('Error al registrar el usuario');
        } 
  
        const resultado = results[0][0];
        res.status(200).json(resultado);
      }
    );
  });

module.exports = router;
