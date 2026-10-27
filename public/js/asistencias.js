requiereLogin()

const tabla = crearTabla({
    contenedor: "tablaAsistencias",
    textoBuscar: "Buscar por trabajador, RUT o fecha…",
    vacio: "No hay registros de asistencia en esta empresa.",
    columnas: [
        { titulo: "Fecha", valor: (a) => a.fecha, html: (a) => escaparHtml(fechaCorta(a.fecha)) },
        { titulo: "Trabajador", valor: (a) => nombreCompleto(a.persona) },
        { titulo: "RUT", valor: (a) => formatearRut(a.persona?.rut, a.persona?.dv) },
        { titulo: "Tipo", valor: (a) => TEXTOS.tipoAsistencia[a.tipo] ?? a.tipo },
        { titulo: "Entrada", valor: (a) => (a.hora_entrada ?? "").slice(0, 5) },
        { titulo: "Salida", valor: (a) => (a.hora_salida ?? "").slice(0, 5) },
        { titulo: "Fuente", valor: (a) => TEXTOS.fuenteAsistencia[a.fuente] ?? a.fuente },
        { titulo: "Aprobación", valor: (a) => textoEstado("aprobacion", a.estado_aprobacion), html: (a) => insignia("aprobacion", a.estado_aprobacion) },
        { titulo: "Observaciones", valor: (a) => a.observaciones ?? "" },
        {
            titulo: "", orden: false, valor: () => "",
            html: (a) => a.estado_aprobacion === "pendiente"
                ? `<button type="button" class="chico" data-estado="aprobada" data-id="${a.id}">Aprobar</button>
                   <button type="button" class="chico secundario" data-estado="rechazada" data-id="${a.id}">Rechazar</button>`
                : `<button type="button" class="chico secundario" data-estado="pendiente" data-id="${a.id}">Volver a pendiente</button>`
        }
    ],
    filtros: [
        { titulo: "Tipo", valor: (a) => a.tipo, opciones: Object.entries(TEXTOS.tipoAsistencia) },
        { titulo: "Aprobación", valor: (a) => a.estado_aprobacion, opciones: opcionesDe("aprobacion") }
    ]
})

let asistencias = []

async function cambiarAprobacion(id, estado) {
    return await llamarApi(`/api/asistencias/${id}/aprobacion`, { method: "PATCH", body: JSON.stringify({ estado }) })
}

async function cargarAsistencias() {
    const listas = await cargarListas(["/api/asistencias", "/api/trabajadores", "/api/personas"])
    if (!listas) {
        return
    }
    const [, trabajadores, personas] = listas
    const personaPorId = porId(personas)

    asistencias = deEmpresaActual(listas[0], (a) => a.Trabajador?.empresa_id)
        .map((asistencia) => ({ ...asistencia, persona: personaPorId.get(asistencia.Trabajador?.persona_id) }))
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    tabla.mostrar(asistencias)

    llenarBuscador(document.getElementById("trabajador"), deEmpresaActual(trabajadores)
        .filter((t) => t.estado !== "postulante")
        .map((trabajador) => {
            const persona = personaPorId.get(trabajador.persona_id)
            return { id: trabajador.id, texto: `${persona ? textoPersona(persona) : "Persona " + trabajador.persona_id} · #${trabajador.id}` }
        }))
}

const formulario = document.getElementById("formCrearAsistencias")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const trabajadorId = valorBuscador(document.getElementById("trabajador"))
    if (trabajadorId === null) {
        mensaje("error", "Elige un trabajador de la lista de sugerencias")
        return
    }

    const valorONulo = (id) => document.getElementById(id).value.trim() || null

    const creada = await crearRegistro("/api/asistencias", {
        trabajador_id: trabajadorId,
        fecha: document.getElementById("fecha").value,
        hora_entrada: valorONulo("horaEntrada"),
        hora_salida: valorONulo("horaSalida"),
        tipo: document.getElementById("tipo").value,
        fuente: document.getElementById("fuente").value,
        observaciones: valorONulo("observaciones")
    }, "Asistencia registrada.")

    if (creada) {
        cerrarPanelCrear(formulario)
        cargarAsistencias()
    }
})

// Solo las marcas aprobadas cuentan al generar el resumen de asistencia del mes.
document.getElementById("tablaAsistencias").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-estado]")
    if (!boton) {
        return
    }
    limpiarMensajes()
    const resultado = await cambiarAprobacion(boton.dataset.id, boton.dataset.estado)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cambiar la aprobación")
        return
    }
    mensaje("info", { aprobada: "Marca aprobada.", rechazada: "Marca rechazada.", pendiente: "Marca devuelta a pendiente." }[boton.dataset.estado])
    cargarAsistencias()
})

document.getElementById("btnAprobarTodas").addEventListener("click", async function () {
    limpiarMensajes()
    const pendientes = tabla.visibles().filter((a) => a.estado_aprobacion === "pendiente")
    if (pendientes.length === 0) {
        mensaje("info", "No hay marcas pendientes en la lista (revisa la búsqueda y los filtros).")
        return
    }
    if (!confirm(`¿Aprobar ${pendientes.length} marca(s) pendiente(s) de la lista?`)) {
        return
    }
    const { hechos, errores } = await enLote(pendientes, (a) => cambiarAprobacion(a.id, "aprobada"),
        (a) => `${nombreCompleto(a.persona)} ${fechaCorta(a.fecha)}`)
    mensaje("info", `Se aprobaron ${hechos} marca(s).`)
    if (errores.length) {
        mensaje("error", "No se pudieron aprobar:")
        mostrarProblemasConNombre(errores)
    }
    cargarAsistencias()
})

document.addEventListener("empresa-lista", cargarAsistencias)
