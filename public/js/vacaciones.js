requiereLogin()

let datosTrabajadores = { trabajadores: [], porId: new Map() }
let vacaciones = []

const tabla = crearTabla({
    contenedor: "tablaVacaciones",
    textoBuscar: "Buscar por trabajador o RUT…",
    vacio: "No hay solicitudes de vacaciones en esta empresa.",
    columnas: [
        { titulo: "Trabajador", valor: (v) => nombreDe(v), html: (v) => `<a href="trabajador.html?id=${v.trabajador_id}#vacaciones">${escaparHtml(nombreDe(v))}</a>` },
        { titulo: "RUT", valor: (v) => (v.Trabajador?.Persona ? formatearRut(v.Trabajador.Persona.rut, v.Trabajador.Persona.dv) : "") },
        { titulo: "Desde", valor: (v) => v.desde, html: (v) => escaparHtml(fechaCorta(v.desde)) },
        { titulo: "Hasta", valor: (v) => v.hasta, html: (v) => escaparHtml(fechaCorta(v.hasta)) },
        { titulo: "Días hábiles", valor: (v) => v.dias_habiles, numero: true },
        {
            titulo: "Estado", valor: (v) => textoEstado("vacacion", v.estado),
            html: (v) => insignia("vacacion", v.estado) + (v.anticipadas && ["pendiente", "aprobada"].includes(v.estado) ? ` <span class="insignia info">Anticipadas</span>` : "")
                + (v.motivo ? `<br><span class="texto-suave">${escaparHtml(v.motivo)}</span>` : "")
        },
        { titulo: "", orden: false, valor: () => "", html: botones }
    ],
    filtros: [{ titulo: "Estado", valor: (v) => v.estado, opciones: [["pendiente", "Pendiente"], ["aprobada", "Aprobada"], ["rechazada", "Rechazada"], ["anulada", "Anulada"]], inicial: "" }]
})

function nombreDe(v) {
    return nombreCompleto(v.Trabajador?.Persona) || `Trabajador ${v.trabajador_id}`
}

function botones(v) {
    if (v.estado === "pendiente") {
        return `<button type="button" class="chico" data-accion="aprobar" data-id="${v.id}">Aprobar</button>
            <button type="button" class="chico secundario" data-accion="rechazar" data-id="${v.id}">Rechazar</button>
            <button type="button" class="chico secundario" data-accion="eliminar" data-id="${v.id}">Eliminar</button>`
    }
    if (v.estado === "aprobada") {
        return `<button type="button" class="chico peligro" data-accion="anular" data-id="${v.id}">Anular</button>`
    }
    return ""
}

async function cargarVacaciones() {
    const resultado = await llamarApi("/api/vacaciones")
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar las vacaciones")
        return
    }
    vacaciones = deEmpresaActual(resultado.datos, (v) => v.Trabajador?.empresa_id)
    tabla.mostrar(vacaciones)
}

// Vista previa: saldo disponible del trabajador elegido.
async function mostrarSaldo() {
    const vista = document.getElementById("vistaPrevia")
    const trabajadorId = valorBuscador(document.getElementById("trabajador"))
    if (trabajadorId === null) {
        vista.textContent = ""
        return
    }
    const resultado = await llamarApi(`/api/vacaciones/saldo/${trabajadorId}`)
    if (resultado.status !== 200) {
        vista.textContent = resultado.datos?.error ?? ""
        return
    }
    const s = resultado.datos
    vista.textContent = `Saldo disponible: ${dias(s.disponible)} día(s) hábil(es)${s.enCurso ? ` · proporcional del período en curso: ${dias(s.enCurso.proporcional)}` : ""}.`
}

document.getElementById("trabajador").addEventListener("change", mostrarSaldo)

document.getElementById("formVacacion").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const trabajadorId = valorBuscador(document.getElementById("trabajador"))
    if (trabajadorId === null) {
        mensaje("error", "Elige un trabajador de la lista de sugerencias")
        return
    }
    const creada = await crearRegistro("/api/vacaciones", {
        trabajador_id: trabajadorId,
        desde: document.getElementById("desde").value,
        hasta: document.getElementById("hasta").value,
        observaciones: document.getElementById("observaciones").value.trim()
    }, "Solicitud registrada.")
    if (creada) {
        mensaje("info", [`Solicitud registrada: ${creada.vacacion.dias_habiles} día(s) hábil(es); el saldo quedaría en ${dias(creada.saldoDespues)}.`, ...creada.avisos].join(" "))
        cerrarPanelCrear(this)
        document.getElementById("vistaPrevia").textContent = ""
        cargarVacaciones()
    }
})

document.getElementById("tablaVacaciones").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-accion]")
    if (!boton) {
        return
    }
    limpiarMensajes()
    const v = vacaciones.find((x) => String(x.id) === boton.dataset.id)
    const texto = `${nombreDe(v)}, del ${fechaCorta(v.desde)} al ${fechaCorta(v.hasta)}`
    const accion = boton.dataset.accion
    let resultado
    if (accion === "aprobar") {
        if (!confirm(`¿Aprobar las vacaciones de ${texto}? Se marcarán en el libro de asistencia.`)) return
        resultado = await llamarApi(`/api/vacaciones/${v.id}/aprobar`, { method: "PATCH", body: "{}" })
    } else if (accion === "rechazar" || accion === "anular") {
        const motivo = prompt(`Motivo para ${accion === "rechazar" ? "rechazar" : "anular"} las vacaciones de ${texto}:`)
        if (motivo === null) return
        resultado = await llamarApi(`/api/vacaciones/${v.id}/${accion}`, { method: "PATCH", body: JSON.stringify({ motivo }) })
    } else if (accion === "eliminar") {
        if (!confirm(`¿Eliminar la solicitud de ${texto}?`)) return
        resultado = await llamarApi(`/api/vacaciones/${v.id}`, { method: "DELETE" })
    }
    if (resultado.status !== 200 && resultado.status !== 204) {
        mensaje("error", resultado.datos?.error ?? "No se pudo completar la acción")
        return
    }
    await cargarVacaciones()
    mensaje("info", { aprobar: "Vacaciones aprobadas y marcadas en el libro.", rechazar: "Solicitud rechazada.", anular: "Vacaciones anuladas: se quitaron sus marcas del libro.", eliminar: "Solicitud eliminada." }[accion])
})

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    datosTrabajadores = (await trabajadoresDeLaEmpresa()) ?? datosTrabajadores
    buscadorVigenteEnFecha(document.getElementById("trabajador"), document.getElementById("desde"), datosTrabajadores.trabajadores, (t) => t.textoBuscador)
    cargarVacaciones()
})
