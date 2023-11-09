const express = require('express');
const path = require('path'); // Importa el módulo 'path'
const router = express.Router();
const connection = require('../db');

router.post('/registro', (req, res) => {
  // Envío de datos al procedimiento almacenado a la Base de datos
  const nombre = req.body.name;
  const correo = req.body.email;
  const contrasena = req.body.password;

  connection.query(
    'CALL sp_InsAdministrador(?, ?, ?)',
    [nombre, correo, contrasena],
    (error, results) => {
      if (error) {
        console.error(error); // Registra el error en la consola del servidor
        res.status(500).send('Error al validar inicio de sesión');
      }
      const resultado = results[0][0];
      //console.log(results);
      if (resultado && resultado.resultado === 'Registro Exitoso') {
        res.redirect('/')
      }else {
        console.log('Error al registrar');
        res.redirect('/registro');
      }
    }
  );
});

module.exports = router;
