const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../pages')));
app.use(express.static(path.join(__dirname, '../Images')));
app.use(express.static(path.join(__dirname, '../scripts')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const connection = require('./db'); // Archivo que contiene la configuración de la base de datos

// llamar a las rutas de registro y login
const registroRoutes = require('./routes/registro');
const loginRoutes = require('./routes/login');

// Definir las rutas de la aplicación
app.use('/', registroRoutes);
app.use('/', loginRoutes);

// Definir las rutas de los endpoints
app.get('/inicio', (req, res) => {
  res.sendFile(path.join(__dirname, '..','pages', 'inicio.html'));
});

app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'pages', 'register.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Correr el servidor web
app.listen(port, () => {
  console.log(`Servidor web en ejecución en http://localhost:${port}`);
});

// Cerrar la conexión a MySQL cuando se cierre el servidor web
process.on('SIGINT', () => {
  connection.end((err) => {
    if (err) {
      console.error('Error al cerrar la conexión a MySQL:', err);
    } else {
      console.log('Conexión a MySQL cerrada con éxito');
    }
    process.exit();
  });
});
