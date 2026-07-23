require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const excel = require('exceljs');
const PDFDocument = require('pdfkit');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de la sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_para_desarrollo_local',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true when running on HTTPS
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Middlewares
app.use(express.static(path.join(__dirname, '../pages')));
app.use(express.static(path.join(__dirname, '../Images')));
app.use(express.static(path.join(__dirname, '../scripts')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const connection = require('./db'); // Configuración de la base de datos
const { requiereAutenticacion } = require('./middleware/auth');
const { connectToWhatsApp } = require('./whatsapp');

// Llamar a los routers de registro, login, contador y alertas
const registroRoutes = require('./routes/registro');
const loginRoutes = require('./routes/login');
const contadorRoutes = require('./routes/contador');
const alertasRoutes = require('./routes/alertas');

// Definir los routers
app.use('/', registroRoutes);
app.use('/', loginRoutes);
app.use('/', contadorRoutes);
app.use('/', alertasRoutes);

// Definir las rutas de las páginas estáticas
app.get('/', (req, res) => {
  // Si ya tiene sesión, redirige al panel de control directamente
  if (req.session && req.session.usuario) {
    return res.redirect('/inicio');
  }
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/inicio', requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'pages', 'inicio.html'));
});

app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'pages', 'register.html'));
});

// Ruta para cerrar sesión
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar la sesión:', err);
      return res.status(500).send('Error interno al cerrar sesión');
    }
    res.redirect('/');
  });
});

// Helper para convertir consultas de base de datos a Promesas
const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// Generar Reporte Excel (con datos de conteo)
app.post('/generarExcel', requiereAutenticacion, async (req, res) => {
  const rangoFechas = req.body.rangoFechas;
  const horaInicio = req.body.horaInicio;
  const horaFin = req.body.horaFin;
  
  if (!rangoFechas || !horaInicio || !horaFin) {
    return res.status(400).send('Campos de reporte incompletos');
  }

  const partes = rangoFechas.split(" ");
  const fechaInicial = partes[0];
  const fechaFinal = partes[2];

  try {
    const results = await queryPromise(
      'SELECT con_general, DATE_FORMAT(con_fecha, "%Y-%m-%d") as con_fecha, con_hora FROM contadorGeneral WHERE con_fecha BETWEEN ? AND ? AND con_hora BETWEEN ? AND ? ORDER BY con_fecha DESC, con_hora DESC;',
      [fechaInicial, fechaFinal, horaInicio, horaFin]
    );

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Conteo');

    worksheet.columns = [
      { header: 'Contador', key: 'con_general', width: 15 },
      { header: 'Fecha', key: 'con_fecha', width: 15 },
      { header: 'Hora', key: 'con_hora', width: 15 },
    ];

    results.forEach((row) => {
      worksheet.addRow(row);
    });

    // Convierte el libro de trabajo a un flujo de datos y envíalo como respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte.xlsx');
    
    await workbook.xlsx.write(res);
    console.log('Archivo Excel enviado con éxito');
  } catch (err) {
    console.error('Error al generar Excel:', err);
    if (!res.headersSent) {
      res.status(500).send('Error al generar el archivo Excel');
    }
  }
});

// Generar Reporte PDF (Contador + Alertas)
app.post('/generarPDF', requiereAutenticacion, async (req, res) => {
  const rangoFechas = req.body.rangoFechas;
  const horaInicio = req.body.horaInicio;
  const horaFin = req.body.horaFin;

  if (!rangoFechas || !horaInicio || !horaFin) {
    return res.status(400).send('Campos de reporte incompletos');
  }

  const partes = rangoFechas.split(" ");
  const fechaInicial = partes[0];
  const fechaFinal = partes[2];

  try {
    // 1. Obtener registros de conteo
    const counts = await queryPromise(
      'SELECT con_general, DATE_FORMAT(con_fecha, "%Y-%m-%d") as con_fecha, con_hora FROM contadorGeneral WHERE con_fecha BETWEEN ? AND ? AND con_hora BETWEEN ? AND ? ORDER BY con_fecha DESC, con_hora DESC;',
      [fechaInicial, fechaFinal, horaInicio, horaFin]
    );

    // 2. Obtener registros de alertas
    const alerts = await queryPromise(
      'SELECT al_tipo, al_descripcion, DATE_FORMAT(al_fecha, "%Y-%m-%d") as al_fecha, al_hora FROM alertas_seguridad WHERE al_fecha BETWEEN ? AND ? AND al_hora BETWEEN ? AND ? ORDER BY al_fecha DESC, al_hora DESC;',
      [fechaInicial, fechaFinal, horaInicio, horaFin]
    );

    // Configurar encabezados de respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_seguridad_${fechaInicial}_a_${fechaFinal}.pdf"`);

    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    doc.pipe(res);

    // Cabecera del Documento - Azul Oscuro (#1E3A8A)
    doc.rect(0, 0, 612, 100).fill('#1E3A8A');
    doc.fillColor('#FFFFFF').fontSize(20).text('SISTEMA DE SEGURIDAD - ITP', 50, 30, { align: 'left' });
    doc.fontSize(10).text(`Reporte de Control de Flujo y Alertas de Seguridad`, 50, 58);
    doc.text(`Rango de fechas: ${fechaInicial} a ${fechaFinal}  |  Horas: ${horaInicio} - ${horaFin}`, 50, 72);

    doc.moveDown(5);

    // --- SECCIÓN 1: CONTROL DE FLUJO ---
    doc.fillColor('#1F2937').fontSize(14).text('1. Resumen de Flujo de Personas', { underline: true });
    doc.moveDown(0.5);

    if (counts.length === 0) {
      doc.fontSize(10).fillColor('#6B7280').text('No se registraron movimientos en este rango de tiempo.');
      doc.moveDown(1.5);
    } else {
      let y = doc.y;
      // Cabecera Tabla Conteo - Azul Claro (#3B82F6)
      doc.rect(50, y, 512, 20).fill('#3B82F6');
      doc.fillColor('#FFFFFF').fontSize(10);
      doc.text('Fecha', 65, y + 5);
      doc.text('Hora', 230, y + 5);
      doc.text('Contador General', 390, y + 5);
      
      y += 20;
      doc.fillColor('#1F2937');
      counts.forEach((row, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
          doc.rect(50, y, 512, 20).fill('#3B82F6');
          doc.fillColor('#FFFFFF');
          doc.text('Fecha', 65, y + 5);
          doc.text('Hora', 230, y + 5);
          doc.text('Contador General', 390, y + 5);
          y += 20;
          doc.fillColor('#1F2937');
        }

        // Color de fila alternado
        if (index % 2 === 0) {
          doc.rect(50, y, 512, 18).fill('#F3F4F6');
          doc.fillColor('#1F2937');
        }
        doc.text(row.con_fecha, 65, y + 4);
        doc.text(row.con_hora, 230, y + 4);
        doc.text(row.con_general.toString(), 390, y + 4);
        y += 18;
      });
      doc.y = y + 15;
    }

    doc.moveDown(1.5);

    // --- SECCIÓN 2: ALERTAS DE SEGURIDAD ---
    doc.fillColor('#1F2937').fontSize(14).text('2. Registro de Incidencias / Alertas', { underline: true });
    doc.moveDown(0.5);

    if (alerts.length === 0) {
      doc.fontSize(10).fillColor('#6B7280').text('No se registraron alertas de seguridad (intrusiones o amenazas) en este rango.');
    } else {
      let y = doc.y;
      // Cabecera Tabla Alertas - Rojo (#EF4444)
      doc.rect(50, y, 512, 20).fill('#EF4444');
      doc.fillColor('#FFFFFF').fontSize(10);
      doc.text('Fecha / Hora', 65, y + 5);
      doc.text('Tipo de Incidencia', 200, y + 5);
      doc.text('Descripción del Evento', 350, y + 5);
      
      y += 20;
      doc.fillColor('#1F2937');
      alerts.forEach((row, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
          doc.rect(50, y, 512, 20).fill('#EF4444');
          doc.fillColor('#FFFFFF');
          doc.text('Fecha / Hora', 65, y + 5);
          doc.text('Tipo de Incidencia', 200, y + 5);
          doc.text('Descripción del Evento', 350, y + 5);
          y += 20;
          doc.fillColor('#1F2937');
        }

        // Color alternado en alertas (tono rojo suave)
        if (index % 2 === 0) {
          doc.rect(50, y, 512, 22).fill('#FEF2F2');
          doc.fillColor('#1F2937');
        }
        
        doc.text(`${row.al_fecha} ${row.al_hora}`, 65, y + 5);
        doc.text(row.al_tipo, 200, y + 5);
        doc.text(row.al_descripcion, 350, y + 5, { width: 200 });
        
        const textHeight = doc.heightOfString(row.al_descripcion, { width: 200 });
        y += Math.max(22, textHeight + 8);
      });
    }

    // Pie de página en todas las hojas
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#9CA3AF');
      doc.text(
        `Página ${i + 1} de ${pages.count}  |  Reporte de Seguridad e Incidencias Tecnológico de Pachuca`,
        50,
        755,
        { align: 'center', width: 512 }
      );
    }

    doc.end();
    console.log('Archivo PDF enviado con éxito');
  } catch (err) {
    console.error('Error al generar PDF:', err);
    if (!res.headersSent) {
      res.status(500).send('Error al generar el archivo PDF');
    }
  }
});

// Correr el servidor web
app.listen(port, () => {
  console.log(`Servidor web en ejecución en http://localhost:${port}`);
  // Conectar con WhatsApp si está activado en el archivo .env
  connectToWhatsApp();
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
