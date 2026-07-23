// Cargar variables de entorno desde el archivo .env
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

// Configurar base de datos en memoria (Mock DB) para ejecutar el sistema sin MySQL
global.dbOffline = false;
const mockUsers = [
  {
    adm_id: 1,
    adm_nombre: 'Administrador Demo',
    adm_correo: 'admin@admin.com',
    // Hash de la contraseña 'admin123'
    adm_contrasena: '$2b$10$4c7Ii.oWJ6QZCYEOpf/zjO9/VedTyDOI3ZkmEM48xLr5IrQTh/RYS' 
  }
];
const mockCounts = [];
const mockAlerts = [];

// Crear el Pool original de conexión a MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_DATABASE || 'people_counter',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

// Interceptar y desviar las consultas si el servidor MySQL está apagado
const originalQuery = pool.query;
pool.query = function (sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  if (global.dbOffline) {
    return handleMockQuery(sql, params, callback);
  }

  // Si no está en modo offline, ejecuta la consulta real en MySQL
  return originalQuery.call(pool, sql, params, (err, results, fields) => {
    if (err) {
      console.warn('⚠️ Error de consulta MySQL, cambiando a base de datos en memoria:', err.message);
      global.dbOffline = true;
      return handleMockQuery(sql, params, callback);
    }
    if (callback) callback(null, results, fields);
  });
};

// Manejador de base de datos en memoria
function handleMockQuery(sql, params, callback) {
  const sqlLower = sql.toLowerCase();
  const fechaActual = new Date().toISOString().slice(0, 10);
  const horaActual = new Date().toTimeString().slice(0, 8);

  // 1. Registro de usuario
  if (sqlLower.includes('sp_insadministrador')) {
    const [nombre, correo, contrasena] = params;
    const existe = mockUsers.find(u => u.adm_correo === correo);
    if (existe) {
      return callback(null, [[{ resultado: 'Correo ya registrado' }]]);
    }
    const nuevoUsuario = {
      adm_id: mockUsers.length + 1,
      adm_nombre: nombre,
      adm_correo: correo,
      adm_contrasena: contrasena
    };
    mockUsers.push(nuevoUsuario);
    console.log(`[Mock DB] Usuario registrado: ${correo}`);
    return callback(null, [[{ resultado: 'Registro Exitoso' }]]);
  }

  // 2. Obtener administrador por correo
  if (sqlLower.includes('sp_obteneradministradorporcorreo')) {
    const correo = params[0];
    const usuario = mockUsers.find(u => u.adm_correo === correo);
    if (usuario) {
      return callback(null, [[usuario]]);
    }
    return callback(null, [[]]);
  }

  // 3. Validar inicio de sesión (Tradicional)
  if (sqlLower.includes('validar_inicio_sesion')) {
    const [correo, contrasena] = params;
    const usuario = mockUsers.find(u => u.adm_correo === correo && u.adm_contrasena === contrasena);
    if (usuario) {
      return callback(null, [[{ mensaje: 'Inicio Exitoso' }]]);
    }
    return callback(null, [[{ mensaje: 'Credenciales Incorrectas' }]]);
  }

  // 4. Insertar conteo general, entrada o salida
  if (sqlLower.includes('sp_insertarcontador')) {
    const count = params[0];
    let direction = 'general';
    if (sqlLower.includes('entrada')) direction = 'entrada';
    if (sqlLower.includes('salida')) direction = 'salida';

    const nuevoConteo = {
      con_general: count,
      con_fecha: fechaActual,
      con_hora: horaActual,
      direction: direction
    };
    mockCounts.push(nuevoConteo);
    return callback(null, []);
  }

  // 5. Insertar alertas de seguridad
  if (sqlLower.includes('insert into alertas_seguridad')) {
    const [tipo, descripcion] = params;
    const nuevaAlerta = {
      al_id: mockAlerts.length + 1,
      al_tipo: tipo,
      al_descripcion: descripcion,
      al_fecha: fechaActual,
      al_hora: horaActual
    };
    mockAlerts.push(nuevaAlerta);
    console.log(`[Mock DB] Alerta de seguridad guardada: [${tipo}] - ${descripcion}`);
    return callback(null, { insertId: nuevaAlerta.al_id });
  }

  // 6. Consultar histórico de contadorGeneral (Reportes)
  if (sqlLower.includes('select con_general') && sqlLower.includes('contadorgeneral')) {
    const [fechaIni, fechaFin, horaIni, horaFin] = params;
    const filtrados = mockCounts
      .filter(c => c.direction === 'general' && c.con_fecha >= fechaIni && c.con_fecha <= fechaFin && c.con_hora >= horaIni && c.con_hora <= horaFin)
      .map(c => ({ con_general: c.con_general, con_fecha: c.con_fecha, con_hora: c.con_hora }));
    return callback(null, filtrados);
  }

  // 7. Consultar alertas de seguridad para reportes o bitácora
  if (sqlLower.includes('select') && sqlLower.includes('alertas_seguridad')) {
    // Si es consulta por rango de fechas (Reportes PDF)
    if (sqlLower.includes('between')) {
      const [fechaIni, fechaFin, horaIni, horaFin] = params;
      const filtrados = mockAlerts.filter(a => a.al_fecha >= fechaIni && a.al_fecha <= fechaFin && a.al_hora >= horaIni && a.al_hora <= horaFin);
      return callback(null, filtrados);
    }
    // Si es para la lista del dashboard de alertas recientes (LIMIT 30)
    const recientes = [...mockAlerts].reverse().slice(0, 30);
    return callback(null, recientes);
  }

  // Fallback genérico
  return callback(null, []);
}

// Probar conexión y activar fallback si es necesario
pool.getConnection((err, connection) => {
  if (err) {
    global.dbOffline = true;
    console.log('\n==================================================================');
    console.log('⚠️ BD MYSQL NO DETECTADA. INICIANDO SISTEMA EN MODO DEMO (IN-MEMORY).');
    console.log('No te preocupes, el sistema funcionará perfectamente guardando los datos');
    console.log('en la memoria local del servidor. No necesitas configurar MySQL.');
    console.log('\n👉 USUARIO DEMO PARA ACCEDER:');
    console.log('   Correo:      admin@admin.com');
    console.log('   Contraseña:  admin123');
    console.log('==================================================================\n');
  } else {
    global.dbOffline = false;
    console.log('Conexión a MySQL establecida con éxito (Pool activo)');
    connection.release();
  }
});

module.exports = pool;
