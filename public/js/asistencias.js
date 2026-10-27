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
        { titulo: "Observaciones", valor: (a) => a.observaciones ?? "" }
    ],
    filtros: [
        { titulo: "Tipo", valor: (a) => a.tipo, opciones: Object.entries(TEXTOS.tipoAsistencia) },
        { titulo: "Aprobación", valor: (a) => a.estado_aprobacion, opciones: opcionesDe("aprobacion") }
    ]
})

async function cargarAsistencias() {
    const listas = await cargarListas(["/api/asistencias", "/api/trabajadores", "/api/personas"])
    if (!listas) {
        return
    }
    const [asistencias, trabajadores, personas] = listas
    const personaPorId = porId(personas)

    tabla.mostrar(deEmpresaActual(asistencias, (a) => a.Trabajador?.empresa_id)
        .map((asistencia) => ({ ...asistencia, persona: personaPorId.get(asistencia.Trabajador?.persona_id) }))
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))))

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

document.addEventListener("empresa-lista", cargarAsistencias)
