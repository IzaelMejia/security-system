const express = require('express');
const router = express.Router();
const connection = require('../db');
const { requiereAutenticacionAPI } = require('../middleware/auth');

router.post('/inicio', requiereAutenticacionAPI, (req, res) => {
  const { count, direction } = req.body;

  // Validar campos obligatorios
  if (count === undefined || !direction) {
    return res.status(400).send('Faltan campos obligatorios (count, direction)');
  }

  // Llamar al procedimiento almacenado adecuado según la dirección
  let procedureName;
  if (direction === 'left') {
    procedureName = 'sp_InsertarContadorEntrada';
  } else if (direction === 'right') {
    procedureName = 'sp_InsertarContadorSalida';
  } else if (direction === 'general') {
    procedureName = 'sp_InsertarContadorGeneral';
  } else {
    return res.status(400).send('Dirección no válida');
  }

  // Ejecutar el procedimiento almacenado en la base de datos
  connection.query(
    `CALL ${procedureName} (?, CURDATE(), CURTIME())`,
    [count],
    (err, results) => {
      if (err) {
        console.error('Error al ejecutar el procedimiento almacenado:', err);
        res.status(500).send('Error interno del servidor');
      } else {
        console.log(`Datos de conteo (${direction}: ${count}) guardados en la base de datos`);
        res.status(200).send('Datos guardados en la base de datos');
      }
    }
  );
});
    
module.exports = router;