const express = require('express');
const router = express.Router();
const connection = require('../db');
const { requiereAutenticacionAPI } = require('../middleware/auth');
const { sendWhatsAppAlert } = require('../whatsapp');

// Guardar una nueva alerta de seguridad (POST /api/alertas)
router.post('/api/alertas', requiereAutenticacionAPI, (req, res) => {
  const { tipo, descripcion } = req.body;

  if (!tipo || !descripcion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (tipo, descripcion)' });
  }

  connection.query(
    'INSERT INTO alertas_seguridad (al_tipo, al_descripcion, al_fecha, al_hora) VALUES (?, ?, CURDATE(), CURTIME())',
    [tipo, descripcion],
    (err, results) => {
      if (err) {
        console.error('Error al guardar la alerta de seguridad:', err);
        return res.status(500).json({ error: 'Error interno al guardar la alerta' });
      }

      // Enviar notificación de WhatsApp en segundo plano
      sendWhatsAppAlert(tipo, descripcion);

      res.status(200).json({ mensaje: 'Alerta registrada con éxito', id: results.insertId });
    }
  );
});

// Obtener las alertas de seguridad más recientes (GET /api/alertas)
router.get('/api/alertas', requiereAutenticacionAPI, (req, res) => {
  connection.query(
    'SELECT al_id, al_tipo, al_descripcion, DATE_FORMAT(al_fecha, "%Y-%m-%d") as al_fecha, al_hora FROM alertas_seguridad ORDER BY al_fecha DESC, al_hora DESC LIMIT 30',
    (err, results) => {
      if (err) {
        console.error('Error al consultar alertas de seguridad:', err);
        return res.status(500).json({ error: 'Error interno al obtener alertas' });
      }
      res.status(200).json(results);
    }
  );
});

module.exports = router;
