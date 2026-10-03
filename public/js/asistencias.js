requiereLogin()

async function cargarAsistencias() {
    const resultado = await llamarApi("/api/asistencias")

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    const lista = document.getElementById("listaAsistencias")
    lista.innerHTML = resultado.datos.map(function (asistencia) {
        return `<li>${asistencia.trabajador_id} (${asistencia.fecha})</li>`
    }).join("")
}

const formulario = document.getElementById("formCrearAsistencias")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    document.getElementById("mensajeError").textContent = ""

    const datos = {
        trabajador_id: document.getElementById("trabajadorId").value,
        fecha: document.getElementById("fecha").value,
        hora_entrada: document.getElementById("horaEntrada").value,
        hora_salida: document.getElementById("horaSalida").value,
        tipo: document.getElementById("tipo").value,
        fuente: document.getElementById("fuente").value,
        observaciones: document.getElementById("observaciones").value
    }

    if (datos.observaciones === "") {
        datos.observaciones = null
    }
    if (datos.hora_entrada === "") {
        datos.hora_entrada = null
    }
    if (datos.hora_salida === "") {
        datos.hora_salida = null
    }

    const resultado = await llamarApi("/api/asistencias", {
        method: "POST",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    formulario.reset()
    cargarAsistencias()
})

document.addEventListener("DOMContentLoaded", cargarAsistencias)