const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

let sock = null;
let isConnected = false;

const qrPath = path.join(__dirname, '../pages/whatsapp-qr.png');

async function connectToWhatsApp() {
  if (process.env.ENABLE_WHATSAPP !== 'true') {
    console.log('Notificaciones de WhatsApp desactivadas (ENABLE_WHATSAPP=false).');
    return;
  }

  console.log('Iniciando cliente de WhatsApp con Baileys...');
  
  // Limpiar código QR anterior si existe
  if (fs.existsSync(qrPath)) {
    try { fs.unlinkSync(qrPath); } catch (e) {}
  }

  // Cargar estado de autenticación (persistencia de sesión)
  const authDir = path.join(__dirname, '../auth_info_baileys');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  // Crear el socket de WhatsApp
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }), // Silenciar logs de depuración interna
    printQRInTerminal: false // Lo imprimiremos manualmente con formato compacto
  });

  // Guardar credenciales al cambiar
  sock.ev.on('creds.update', saveCreds);

  // Monitorear cambios de estado en la conexión
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Si recibimos un nuevo código QR
    if (qr) {
      console.log('\n======================================================');
      console.log('⚠️ SE REQUIERE VINCULACIÓN CON WHATSAPP');
      console.log('Escanea el siguiente código QR con tu aplicación de WhatsApp:');
      
      // 1. Mostrar QR en consola
      QRCode.toString(qr, { type: 'terminal', small: true }, (err, terminalQR) => {
        if (!err) console.log(terminalQR);
      });

      // 2. Guardar QR en archivo de imagen para acceso web
      QRCode.toFile(qrPath, qr, { scale: 8 }, (err) => {
        if (err) console.error('Error al guardar la imagen del código QR:', err);
        else console.log(`[Browser QR] Imagen QR generada en: pages/whatsapp-qr.png`);
      });
      console.log('======================================================\n');
    }

    if (connection === 'close') {
      isConnected = false;
      const errorStatusCode = lastDisconnect?.error?.output?.statusCode;
      const statusReason = lastDisconnect?.error?.output?.payload?.message;
      
      console.log(`Conexión de WhatsApp cerrada. Código: ${errorStatusCode} | Motivo: ${statusReason}`);
      
      const shouldReconnect = errorStatusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('Reintentando conexión en 5 segundos...');
        setTimeout(connectToWhatsApp, 5000);
      } else {
        console.log('Sesión cerrada. Por favor borre la carpeta "auth_info_baileys" y reinicie el servidor para escanear un nuevo QR.');
        // Limpiar QR si fue desvinculado
        if (fs.existsSync(qrPath)) {
          try { fs.unlinkSync(qrPath); } catch (e) {}
        }
      }
    } else if (connection === 'open') {
      isConnected = true;
      console.log('======================================================');
      console.log('✅ CONEXIÓN A WHATSAPP ESTABLECIDA CON ÉXITO');
      console.log('El bot está listo para enviar alertas de seguridad.');
      console.log('======================================================');

      // Eliminar archivo QR cuando esté conectado
      if (fs.existsSync(qrPath)) {
        try { fs.unlinkSync(qrPath); } catch (e) {}
      }
    }
  });
}

/**
 * Enviar mensaje de alerta vía WhatsApp
 * @param {string} tipo Tipo de alerta ('Intrusión', 'Amenaza Detectada')
 * @param {string} descripcion Detalles adicionales
 */
async function sendWhatsAppAlert(tipo, descripcion) {
  if (process.env.ENABLE_WHATSAPP !== 'true') return;
  
  if (!sock || !isConnected) {
    console.warn('⚠️ No se puede enviar WhatsApp: El cliente no está conectado.');
    return;
  }

  const recipient = process.env.WHATSAPP_RECIPIENT_NUMBER;
  if (!recipient || recipient === '521XXXXXXXXXX') {
    console.warn('⚠️ No se puede enviar WhatsApp: Número de destinatario no configurado.');
    return;
  }

  try {
    // Formatear el JID correcto
    const cleanNumber = recipient.replace(/[^0-9]/g, '');
    const recipientJid = `${cleanNumber}@s.whatsapp.net`;

    const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Mensaje formateado con sintaxis de WhatsApp
    const text = `🚨 *ALERTA DE SEGURIDAD - SISTEMA ITP* 🚨\n\n` +
                 `*Incidencia:* ${tipo}\n` +
                 `*Fecha:* ${fecha}\n` +
                 `*Hora:* ${hora}\n` +
                 `*Detalles:* _${descripcion}_\n\n` +
                 `⚠️ _Por favor, verifique las cámaras del sistema de inmediato._`;

    await sock.sendMessage(recipientJid, { text });
    console.log(`Alerta de WhatsApp enviada con éxito a ${cleanNumber}`);
  } catch (error) {
    console.error('Error al enviar la alerta de WhatsApp:', error);
  }
}

module.exports = {
  connectToWhatsApp,
  sendWhatsAppAlert
};
