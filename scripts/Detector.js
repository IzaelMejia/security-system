// Variables para el seguimiento y conteo
let leftCount = 0;
let rightCount = 0;
let generalCount = 0;
let personInside = false;

// Modo de detección activo: 'counter', 'intrusion', 'threat'
let currentMode = 'counter';

// Variables para la cámara y el modelo
let video, model;

// Configurar el selector de modo en la interfaz
document.addEventListener('DOMContentLoaded', () => {
  const modeSelector = document.getElementById('detectionMode');
  if (modeSelector) {
    modeSelector.addEventListener('change', (e) => {
      currentMode = e.target.value;
      console.log('Modo de detección cambiado a:', currentMode);
    });
  }

  // Vincular el botón Reset
  const resetButton = document.getElementById('resetCount');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      leftCount = 0;
      rightCount = 0;
      generalCount = 0;

      document.getElementById('leftCount').innerHTML = `${leftCount}`;
      document.getElementById('rightCount').innerHTML = `${rightCount}`;
      document.getElementById('generalCount').innerHTML = `${generalCount}`;

      sendDataToServer(0, 'left');
      sendDataToServer(0, 'right');
      sendDataToServer(0, 'general');
      console.log('Contadores reiniciados a cero.');
    });
  }

  // Cargar alertas iniciales
  fetchAlerts();
});

// Función para configurar la cámara
async function setupCamera() {
  video = document.getElementById('video');
  const stream = await navigator.mediaDevices.getUserMedia({ 'audio': false, 'video': true });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

// Función para cargar el modelo COCO-SSD
async function loadModel() {
  model = await cocoSsd.load();
}

// Función para registrar el conteo en la base de datos
function sendDataToServer(count, direction) {
  const data = {
    count: count,
    direction: direction
  };

  axios.post('/inicio', data)
    .then(response => {
      console.log(`Datos de conteo (${direction}: ${count}) enviados al servidor`);
    })
    .catch(error => {
      console.error('Error al enviar datos de conteo al servidor', error);
    });
}

// AudioContext para generar sonidos de alarma sin archivos de audio externos
let audioCtx = null;
function playAlarmSound(type) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Si el contexto de audio está en suspensión, reactivarlo
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'intrusion') {
      // Tono de alerta de intrusión (pulso grave-agudo)
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(700, audioCtx.currentTime + 0.35);
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } else if (type === 'threat') {
      // Alarma de amenaza crítica (sirena aguda rápida)
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(1300, audioCtx.currentTime + 0.2);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch (err) {
    console.error('Error al reproducir audio de alarma:', err);
  }
}

// Envío y control de bitácora de alertas (con Cooldown de 8 segundos por tipo para evitar saturación)
let alertCooldowns = {};
function logAlertToServer(type, desc) {
  const now = Date.now();
  if (alertCooldowns[desc] && (now - alertCooldowns[desc] < 8000)) {
    return; // En periodo de enfriamiento
  }
  alertCooldowns[desc] = now;

  // Reproducir sonido de alarma local
  playAlarmSound(type === 'Intrusión' ? 'intrusion' : 'threat');

  axios.post('/api/alertas', { tipo: type, descripcion: desc })
    .then(response => {
      console.log('Alerta registrada en la base de datos con éxito:', type);
      fetchAlerts(); // Actualizar panel de alertas
    })
    .catch(error => {
      console.error('Error al registrar alerta en el servidor:', error);
    });
}

// Cargar y mostrar la bitácora de alertas recientes
function fetchAlerts() {
  axios.get('/api/alertas')
    .then(response => {
      const container = document.getElementById('listaAlertas');
      if (!container) return;

      const alerts = response.data;
      if (alerts.length === 0) {
        container.innerHTML = '<p class="alertaVacia">No hay alertas de seguridad registradas.</p>';
        return;
      }

      container.innerHTML = alerts.map(al => {
        const itemClass = al.al_tipo === 'Intrusión' ? 'intrusión' : 'amenaza';
        const icon = al.al_tipo === 'Intrusión' ? '🚧' : '🚨';
        return `
          <div class="alertaItem ${itemClass}">
            <div class="alertaHeader">
              <span>${icon} ${al.al_tipo}</span>
              <span class="alertaHora">${al.al_fecha} ${al.al_hora}</span>
            </div>
            <div>${al.al_descripcion}</div>
          </div>
        `;
      }).join('');
    })
    .catch(error => {
      console.error('Error al obtener alertas de seguridad:', error);
    });
}

// Función principal para detectar personas y alertas en tiempo real
async function detectPeople() {
  const canvas = document.getElementById('output');
  const context = canvas.getContext('2d');
  
  // Área de detección para Conteo e Intrusión
  const detectionArea = {
    x: 220,
    y: 130,
    width: 200,
    height: 200
  };

  // Función interna recursiva de renderizado
  async function detect() {
    const predictions = await model.detect(video);
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dibujar overlay visual según el modo
    if (currentMode === 'counter') {
      context.beginPath();
      context.rect(detectionArea.x, detectionArea.y, detectionArea.width, detectionArea.height);
      context.lineWidth = 3;
      context.strokeStyle = '#004791';
      context.stroke();
      context.fillStyle = '#004791';
      context.font = '14px Arial';
      context.fillText('ÁREA DE CONTEO', detectionArea.x + 5, detectionArea.y - 8);
    } else if (currentMode === 'intrusion') {
      context.beginPath();
      context.rect(detectionArea.x, detectionArea.y, detectionArea.width, detectionArea.height);
      context.lineWidth = 3;
      context.strokeStyle = '#D97706'; // Color ámbar
      context.setLineDash([6, 4]); // Línea discontinua
      context.stroke();
      context.setLineDash([]); // Limpiar estilo
      context.fillStyle = '#D97706';
      context.font = 'bold 14px Arial';
      context.fillText('ZONA RESTRINGIDA (MONITOREO)', detectionArea.x + 5, detectionArea.y - 8);
    } else if (currentMode === 'threat') {
      context.fillStyle = '#DC2626';
      context.font = 'bold 14px Arial';
      context.fillText('ESCÁNER DE AMENAZAS ACTIVO', 15, 25);
    }

    predictions.forEach((prediction) => {
      const [x, y, w, h] = prediction.bbox;
      const centerX = x + w / 2;
      const centerY = y + h / 2;

      // --- MODO 1: CONTEO DE PERSONAS ---
      if (currentMode === 'counter' && prediction.class === 'person') {
        context.beginPath();
        context.rect(x, y, w, h);
        context.lineWidth = 2;
        context.strokeStyle = '#00D1FF';
        context.stroke();
        context.fillStyle = '#00D1FF';
        context.font = '12px Arial';
        context.fillText(`Persona (${Math.round(prediction.score * 100)}%)`, x, y > 10 ? y - 5 : 10);

        // Validar si entra en el área
        const inArea = centerX > detectionArea.x && centerX < detectionArea.x + detectionArea.width &&
                      centerY > detectionArea.y && centerY < detectionArea.y + detectionArea.height;

        if (inArea) {
          if (!personInside) {
            personInside = true;
            if (centerX < detectionArea.x + detectionArea.width / 2) {
              leftCount++;
              sendDataToServer(leftCount, 'left');
            } else {
              rightCount++;
              sendDataToServer(rightCount, 'right');
            }
            generalCount = Math.max(leftCount - rightCount, 0);
            sendDataToServer(generalCount, 'general');
          }
        } else {
          personInside = false;
        }
      }

      // --- MODO 2: CONTROL DE INTRUSIÓN (TRES PASSING) ---
      else if (currentMode === 'intrusion' && prediction.class === 'person') {
        const inRestrictedZone = centerX > detectionArea.x && centerX < detectionArea.x + detectionArea.width &&
                                 centerY > detectionArea.y && centerY < detectionArea.y + detectionArea.height;

        if (inRestrictedZone) {
          // Bounding Box roja de Alerta de Intrusión
          context.beginPath();
          context.rect(x, y, w, h);
          context.lineWidth = 3;
          context.strokeStyle = '#DC2626';
          context.stroke();
          context.fillStyle = '#DC2626';
          context.font = 'bold 12px Arial';
          context.fillText('INTRUSO DETECTADO', x, y > 10 ? y - 5 : 10);

          // Registrar alerta en backend
          logAlertToServer(
            'Intrusión',
            `Persona ingresó ilegalmente a la zona de monitoreo restringida.`
          );
        } else {
          // Persona detectada fuera del área restringida
          context.beginPath();
          context.rect(x, y, w, h);
          context.lineWidth = 2;
          context.strokeStyle = '#4B5563';
          context.stroke();
          context.fillStyle = '#4B5563';
          context.font = '12px Arial';
          context.fillText('Persona', x, y > 10 ? y - 5 : 10);
        }
      }

      // --- MODO 3: DETECCIÓN DE AMENAZAS (ARMAS) ---
      // Detecta armas blancas (knife en COCO-SSD) y simula detección de armas de fuego mediante 'cell phone'
      else if (currentMode === 'threat') {
        const isKnife = prediction.class === 'knife';
        // Simulamos un "cell phone" (teléfono) como un arma de fuego para demostración, o una tijera ("scissors")
        const isSimulatedGun = prediction.class === 'cell phone' || prediction.class === 'scissors';

        if (isKnife || isSimulatedGun) {
          const type = isKnife ? 'Arma Blanca (Cuchillo)' : 'Posible Arma de Fuego';
          
          context.beginPath();
          context.rect(x, y, w, h);
          context.lineWidth = 4;
          context.strokeStyle = '#DC2626'; // Rojo parpadeante/fuerte
          context.stroke();
          context.fillStyle = '#DC2626';
          context.font = 'bold 14px Arial';
          context.fillText(`PELIGRO: ${type.toUpperCase()}`, x, y > 10 ? y - 5 : 10);

          // Log de alerta de amenaza en toda la pantalla
          logAlertToServer(
            'Amenaza Detectada',
            `Objeto peligroso detectado: ${type} en las coordenadas del plano de cámara.`
          );
        } else if (prediction.class === 'person') {
          // Dibujar persona de forma neutral en este modo
          context.beginPath();
          context.rect(x, y, w, h);
          context.lineWidth = 2;
          context.strokeStyle = '#1E3A8A';
          context.stroke();
        }
      }
    });

    // Actualizar contadores visuales en la barra lateral
    if (currentMode === 'counter') {
      document.getElementById('leftCount').innerHTML = `${leftCount}`;
      document.getElementById('rightCount').innerHTML = `${rightCount}`;
      generalCount = Math.max(leftCount - rightCount, 0); 
      document.getElementById('generalCount').innerHTML = `${generalCount}`;
    }

    requestAnimationFrame(detect);
  }

  // Iniciar detección continua
  detect();
}

// Iniciar cámara, modelo y monitoreo
async function start() {
  try {
    await setupCamera();
    await loadModel();
    detectPeople();
    console.log('Detección inicializada con éxito');
  } catch (err) {
    console.error('Error al iniciar el sistema de detección:', err);
  }
}

start();
