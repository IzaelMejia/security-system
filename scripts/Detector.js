
    // Variables para el seguimiento y conteo
    let leftCount = 0;
    let rightCount = 0;
    let generalCount = 0;
    let personInside = false;

    // Variables para la cámara y el modelo
    let video, model;

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

    // Función principal para detectar personas y contar
    async function detectPeople() {
        const canvas = document.getElementById('output');
        const context = canvas.getContext('2d');
        const detectionArea = {
            x: 220,
            y: 130,
            width: 150,
            height: 150
        };

        // Función interna para realizar la detección
        async function detect() {
            const predictions = await model.detect(video);
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Dibujar el área de detección
            context.beginPath();
            context.rect(detectionArea.x, detectionArea.y, detectionArea.width, detectionArea.height);
            context.lineWidth = 2;
            context.strokeStyle = 'blue';
            context.stroke();

            predictions.forEach((prediction) => {
                if (prediction.class === 'person') {
                    context.beginPath();
                    context.rect(
                        prediction.bbox[0],
                        prediction.bbox[1],
                        prediction.bbox[2],
                        prediction.bbox[3]
                    );
                    context.lineWidth = 2;
                    context.strokeStyle = 'red';
                    context.fillStyle = 'red';
                    context.stroke();
                    context.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, prediction.bbox[0], prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10);

                    // Verificar si la persona está dentro del área de detección
                    const centerX = prediction.bbox[0] + prediction.bbox[2] / 2;
                    const centerY = prediction.bbox[1] + prediction.bbox[3] / 2;

                    const inDetectionArea = centerX > detectionArea.x && centerX < detectionArea.x + detectionArea.width &&
                                            centerY > detectionArea.y && centerY < detectionArea.y + detectionArea.height;

                        if (inDetectionArea) {
                            if (!personInside) {
                                // Persona acaba de entrar en el área de detección
                                personInside = true;
            
                                if (centerX < detectionArea.x + detectionArea.width / 2) {
                                    // Persona se dirige hacia la izquierda
                                    leftCount++;
                                } else {
                                    // Persona se dirige hacia la derecha
                                    rightCount++;
                                }
                            }
                        } else {
                            // Persona fuera del área de detección
                            personInside = false;
                        }
                    }
                });

                // Actualizar los contadores
                document.getElementById('leftCount').innerHTML = `${leftCount}`;
                document.getElementById('rightCount').innerHTML = `${rightCount}`;

                // Actualizar el contador general
                generalCount = leftCount- rightCount ;
                document.getElementById('generalCount').innerHTML = `${generalCount}`;

            // Realizar la detección en el siguiente cuadro de video
            requestAnimationFrame(detect);
        }

        // Iniciar la detección
        detect();
    }

    // Función principal para configurar la cámara, cargar el modelo y comenzar la detección
    async function start() {
        await setupCamera();
        await loadModel();
        detectPeople();
    }

    // Iniciar el proceso cuando la página se carga
    start();
