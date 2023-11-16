const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const excel = require('exceljs');
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
const contadorRoutes = require('./routes/contador');

// Definir las rutas de la aplicación
app.use('/', registroRoutes);
app.use('/', loginRoutes);
app.use('/', contadorRoutes);

// Definir las rutas de los endpoints
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/inicio', (req, res) => {
  res.sendFile(path.join(__dirname, '..','pages', 'inicio.html'));
});

app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'pages', 'register.html'));
});

app.post('/generarExcel', (req, res) => {
  const rangoFechas = req.body.rangoFechas;
  const horaInicio = req.body.horaInicio;
  const horaFin = req.body.horaFin;
  
  const partes = rangoFechas.split(" ");
  const fechaInicial = partes[0];
  const fechaFinal = partes[2];

  connection.query(
    'SELECT con_general, con_fecha, con_hora FROM contadorGeneral WHERE con_fecha BETWEEN ? AND ? AND con_hora BETWEEN ? AND ?;',
    [fechaInicial, fechaFinal, horaInicio, horaFin],
    (err, results) => {
      if (err) {
        console.error('Error al consultar la base de datos:', err);
        res.status(500).send('Error al consultar la base de datos');
      } else {
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Reporte');

        worksheet.columns = [
          { header: 'Contador', key: 'con_general', width: 15 },
          { header: 'Fecha', key: 'con_fecha', width: 15 },
          { header: 'Hora', key: 'con_hora', width: 15 },
        ];

        results.forEach((row) => {
          worksheet.addRow(row);
        });

        // Convierte el libro de trabajo a un flujo de datos y envíalo como respuesta
        workbook.xlsx.write(res, { type: 'stream' })
          .then(() => {
            console.log('Archivo Excel enviado con éxito');
          })
          .catch((error) => {
            console.error('Error al enviar el archivo Excel:', error);
            res.status(500).send('Error al enviar el archivo Excel');
          });
      }
    }
  );
  
  console.log('Fecha Inicio:', fechaInicial);
  console.log('Fecha Final:', fechaFinal);
  console.log('Rango de Fecha seleccionada:', rangoFechas);
  console.log('Hora de inicio:', horaInicio);
  console.log('Hora de fin:', horaFin);
});

// ... (código existente)

app.post('/generarPDF', async (req, res) => {
  const rangoFechas = req.body.rangoFechas;
  const horaInicio = req.body.horaInicio;
  const horaFin = req.body.horaFin;

  const partes = rangoFechas.split(" ");
  const fechaInicial = partes[0];
  const fechaFinal = partes[2];

  // Realiza la consulta a la base de datos utilizando la conexión MySQL
  connection.query(
    'SELECT con_general, con_fecha, con_hora FROM contadorGeneral WHERE con_fecha BETWEEN ? AND ? AND con_hora BETWEEN ? AND ?;',
    [fechaInicial, fechaFinal, horaInicio, horaFin],
    async (err, results) => {
      if (err) {
        console.error('Error al consultar la base de datos:', err);
        res.status(500).send('Error al consultar la base de datos');
      } else {

      }
    }
  );

  console.log('Fecha Inicio:', fechaInicial);
  console.log('Fecha Final:', fechaFinal);
  console.log('Rango de Fecha seleccionada:', rangoFechas);
  console.log('Hora de inicio:', horaInicio);
  console.log('Hora de fin:', horaFin);
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
