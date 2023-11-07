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
