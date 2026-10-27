requiereLogin()

const tabla = crearTabla({
    contenedor: "tablaTrabajadores",
    textoBuscar: "Buscar por nombre, RUT o cargo…",
    vacio: "Esta empresa todavía no tiene trabajadores ni postulantes.",
    columnas: [
        { titulo: "ID", valor: (t) => t.id, numero: true },
        {
            titulo: "Nombre", valor: (t) => nombreCompleto(t.persona),
            html: (t) => `<a href="trabajador.html?id=${t.id}">${escaparHtml(nombreCompleto(t.persona) || "Trabajador " + t.id)}</a>`
        },
        { titulo: "RUT", valor: (t) => formatearRut(t.persona?.rut, t.persona?.dv) },
        { titulo: "Cargo", valor: (t) => t.cargo ?? "" },
        { titulo: "Ingreso", valor: (t) => t.fecha_ingreso ?? "", html: (t) => escaparHtml(fechaCorta(t.fecha_ingreso)) },
        { titulo: "Término", valor: (t) => t.fecha_termino ?? "", html: (t) => escaparHtml(fechaCorta(t.fecha_termino)) },
        { titulo: "Estado", valor: (t) => textoEstado("trabajador", t.estado), html: (t) => insignia("trabajador", t.estado) }
    ],
    filtros: [{ titulo: "Estado", valor: (t) => t.estado, opciones: opcionesDe("trabajador") }]
})

async function cargarTrabajadores() {
    const listas = await cargarListas(["/api/trabajadores", "/api/personas", "/api/contratos", "/api/cargos"])
    if (!listas) {
        return
    }
    const [trabajadores, personas, contratos, cargos] = listas
    const personaPorId = porId(personas)
    const cargoPorId = porId(cargos)

    tabla.mostrar(deEmpresaActual(trabajadores).map((trabajador) => {
        const vigente = contratos
            .filter((c) => c.trabajador_id === trabajador.id && c.estado === "vigente")
            .sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)))[0]
        return {
            ...trabajador,
            persona: personaPorId.get(trabajador.persona_id),
            cargo: vigente ? cargoPorId.get(vigente.cargo_id)?.nombre : null
        }
    }))

    llenarBuscador(document.getElementById("persona"),
        deEmpresaActual(personas).map((persona) => ({ id: persona.id, texto: textoPersona(persona) })))
}

const formulario = document.getElementById("formCrearTrabajador")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    if (exigirEmpresaActual() === null) {
        return
    }

    const personaId = valorBuscador(document.getElementById("persona"))
    if (personaId === null) {
        mensaje("error", "Elige una persona de la lista de sugerencias")
        return
    }

    const creado = await crearRegistro("/api/trabajadores", {
        persona_id: personaId,
        empresa_id: empresaActual(),
        fecha_ingreso: document.getElementById("fechaIngreso").value
    }, "Postulante creado.")

    if (creado) {
        cerrarPanelCrear(formulario)
        cargarTrabajadores()
    }
})

document.getElementById("btnNomina").addEventListener("click", function () {
    descargarCsv(`nomina-trabajadores-${hoyIso()}.csv`, [
        ["ID", (t) => t.id],
        ["RUT", (t) => formatearRut(t.persona?.rut, t.persona?.dv)],
        ["Nombre", (t) => nombreCompleto(t.persona)],
        ["Cargo", (t) => t.cargo ?? ""],
        ["Ingreso", (t) => fechaCorta(t.fecha_ingreso)],
        ["Término", (t) => fechaCorta(t.fecha_termino)],
        ["Estado", (t) => textoEstado("trabajador", t.estado)]
    ], tabla.visibles())
})

document.addEventListener("empresa-lista", cargarTrabajadores)
