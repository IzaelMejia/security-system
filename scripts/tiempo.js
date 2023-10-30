function actualizarHora() {
    const contenedorHora = document.getElementById("realTime");
    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const segundos = ahora.getSeconds();

    const horaFormateada = `${hora}:${minutos}:${segundos}`;

    contenedorHora.textContent = horaFormateada;
}

// Actualiza la hora cada segundo
setInterval(actualizarHora, 1000);

// Llama a la función para establecer la hora actual de inmediato
actualizarHora();