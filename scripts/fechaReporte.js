document.addEventListener('DOMContentLoaded', function () {
    // Verifica si el elemento existe antes de agregar el event listener
    var mostrarCalendarioBtn = document.getElementById("mostrarCalendario");
    if (mostrarCalendarioBtn) {
        mostrarCalendarioBtn.addEventListener("click", function () {
            var calendario = document.getElementById("calendario");
            if (calendario) {
                calendario.style.display = "block";
            }
        });
    }

    // Verifica si el elemento existe antes de agregar el event listener
    var cerrarCalendarioBtn = document.getElementById("cerrarCalendario");
    if (cerrarCalendarioBtn) {
        cerrarCalendarioBtn.addEventListener("click", function () {
            var calendario = document.getElementById("calendario");
            if (calendario) {
                calendario.style.display = "none";
            }
        });
    }

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

    // Verifica si el elemento existe antes de agregar el event listener
    var mostrarExcelBtn = document.getElementById("mostrarExcel");
    if (mostrarExcelBtn) {
        mostrarExcelBtn.addEventListener("click", function () {
            var rangoFechas = document.getElementById("rangoFechas").value;
            var horaInicio = document.getElementById("horaInicio").value;
            var horaFin = document.getElementById("horaFin").value;

            if (rangoFechas && horaInicio && horaFin) {
                // Envía una solicitud al servidor para obtener datos de la base de datos
                axios.post('/generarExcel', { rangoFechas, horaInicio, horaFin }, { responseType: 'blob' })
                    .then(function (response) {
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
                    .catch(function (error) {
                        console.error('Error al obtener datos de la base de datos:', error);
                    });
            } else {
                document.getElementById("rangoSeleccionado").textContent = "Por favor, completa todos los campos.";
            }
        });
    }

    // Verifica si el elemento existe antes de agregar el event listener
    var mostrarPDFBtn = document.getElementById("mostrarPDF");
    if (mostrarPDFBtn) {
        mostrarPDFBtn.addEventListener("click", function () {
            var rangoFechas = document.getElementById("rangoFechas").value;
            var horaInicio = document.getElementById("horaInicio").value;
            var horaFin = document.getElementById("horaFin").value;

            if (rangoFechas && horaInicio && horaFin) {
                // Envía una solicitud al servidor para obtener datos de la base de datos
                axios.post('/generarPDF', { rangoFechas, horaInicio, horaFin }, { responseType: 'blob' })
                    .then(function (response) {
                        // Crea un objeto Blob desde la respuesta
                        var blob = new Blob([response.data], { type: 'application/pdf' });

                        // Crea un enlace temporal y simula un clic para iniciar la descarga
                        var link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.download = 'reporte_seguridad.pdf';

                        // Agrega el enlace al DOM y simula un clic para iniciar la descarga
                        document.body.appendChild(link);
                        link.click();

                        // Elimina el enlace del DOM después de la descarga
                        document.body.removeChild(link);
                    })
                    .catch(function (error) {
                        console.error('Error al obtener datos de la base de datos:', error);
                    });
            } else {
                document.getElementById("rangoSeleccionado").textContent = "Por favor, completa todos los campos.";
            }
        });
    }
});
