// MOSTRAR EL CALENDARIO 
// Obtén una referencia al botón
document.getElementById("mostrarCalendario").addEventListener("click", function() {
    document.getElementById("calendario").style.display = "block";
});

// OCULTAR EL CALENDARIO
document.getElementById("cerrarCalendario").addEventListener("click", function() {
    document.getElementById("calendario").style.display = "none";
});

document.addEventListener('DOMContentLoaded', function() {
    flatpickr("#rangoFechas", {
        mode: "range",
        dateFormat: "Y-m-d",
        locale: "es",
    });

    flatpickr("#horaInicio, #horaFin", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
    });

    document.getElementById("mostrarRango").addEventListener("click", function() {
        var rangoFechas = document.getElementById("rangoFechas").value;
        var horaInicio = document.getElementById("horaInicio").value;
        var horaFin = document.getElementById("horaFin").value;

        if (rangoFechas && horaInicio && horaFin) {
            // Comprueba si la hora de fin es mayor o igual que la hora de inicio
            var horaInicioObj = new Date("2000-01-01 " + horaInicio);
            var horaFinObj = new Date("2000-01-01 " + horaFin);

            if (horaFinObj >= horaInicioObj) {
                var rangoSeleccionado = "Rango de fechas: " + rangoFechas + "<br>";
                rangoSeleccionado += "Hora de inicio: " + horaInicio + "<br>";
                rangoSeleccionado += "Hora de fin: " + horaFin;

                document.getElementById("rangoSeleccionado").innerHTML = rangoSeleccionado;
                document.getElementById("rangoFechas").value = "";
                document.getElementById("horaInicio").value = "";
                document.getElementById("horaFin").value = "";
            } else {
                document.getElementById("rangoSeleccionado").textContent = "La hora de fin no puede ser menor que la hora de inicio.";
            }
        } else {
            document.getElementById("rangoSeleccionado").textContent = "Por favor, completa todos los campos.";
        }
    });
});

document.getElementById("mostrarExcel").addEventListener("click", function() {
    var rangoFechas = document.getElementById("rangoFechas").value;
    var horaInicio = document.getElementById("horaInicio").value;
    var horaFin = document.getElementById("horaFin").value;

    if (rangoFechas && horaInicio && horaFin) {
        // Envía una solicitud al servidor para obtener datos de la base de datos
        axios.post('/generarExcel', { rangoFechas, horaInicio, horaFin }, { responseType: 'blob' })
            .then(function(response) {
                // Crea un objeto Blob desde la respuesta
                var blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                // Crea un enlace temporal y simula un clic para iniciar la descarga
                var link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = 'reporte.xlsx';
                
                // Agrega el enlace al DOM y simula un clic para iniciar la descarga
                document.body.appendChild(link);
                link.click();

                // Elimina el enlace del DOM después de la descarga
                document.body.removeChild(link);
            })
            .catch(function(error) {
                console.error('Error al obtener datos de la base de datos:', error);
            });
    } else {
        document.getElementById("rangoSeleccionado").textContent = "Por favor, completa todos los campos.";
    }
});

document.getElementById("mostrarPDF").addEventListener("click", function () {
    var rangoFechas = document.getElementById("rangoFechas").value;
    var horaInicio = document.getElementById("horaInicio").value;
    var horaFin = document.getElementById("horaFin").value;

    if (rangoFechas && horaInicio && horaFin) {
        // Envía una solicitud al servidor para obtener datos de la base de datos
        axios.post('/generarPDF', { rangoFechas, horaInicio, horaFin })
            .then(function (response) {
                console.error('PDF creado exitosamente');
            })
            .catch(function (error) {
                console.error('Error al obtener datos de la base de datos:', error);
            });
    } else {
        document.getElementById("rangoSeleccionado").textContent = "Por favor, completa todos los campos.";
    }
});


  
