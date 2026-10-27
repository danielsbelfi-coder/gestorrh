requiereLogin()

const selectorPeriodo = document.getElementById("periodo")
let periodos = []
let datosTrabajadores = { trabajadores: [], porId: new Map() }
let filas = []
let filaEnEdicion = null

function periodoElegido() {
    return periodos.find((p) => String(p.id) === selectorPeriodo.value) ?? null
}

const tabla = crearTabla({
    contenedor: "tablaResumenes",
    textoBuscar: "Buscar por nombre o RUT…",
    vacio: "No hay trabajadores contratados en este periodo.",
    columnas: [
        { titulo: "Trabajador", valor: (f) => f.trabajador.nombre, html: (f) => `<a href="trabajador.html?id=${f.trabajador.id}">${escaparHtml(f.trabajador.nombre)}</a>` },
        { titulo: "RUT", valor: (f) => f.trabajador.rut },
        { titulo: "Inasistencia", valor: (f) => f.resumen?.dias_inasistencia ?? "", numero: true },
        { titulo: "Licencia", valor: (f) => f.resumen?.dias_licencia_medica ?? "", numero: true },
        { titulo: "Permiso s/goce", valor: (f) => f.resumen?.dias_permiso_sin_goce ?? "", numero: true },
        { titulo: "Vacaciones", valor: (f) => f.resumen?.dias_vacaciones ?? "", numero: true },
        { titulo: "Atraso (min)", valor: (f) => f.resumen?.minutos_atraso ?? "", numero: true },
        { titulo: "Fuente", valor: (f) => f.resumen ? (TEXTOS.fuenteRegistro[f.resumen.fuente] ?? f.resumen.fuente) : "" },
        { titulo: "Estado", valor: (f) => textoEstado("resumen", f.estado), html: (f) => insignia("resumen", f.estado) },
        { titulo: "", orden: false, valor: () => "", html: botones }
    ],
    filtros: [{ titulo: "Estado", valor: (f) => f.estado, opciones: opcionesDe("resumen") }]
})

function botones(fila) {
    if (periodoElegido()?.estado !== "abierto") {
        return ""
    }
    const id = fila.trabajador.id
    if (fila.estado === "aprobado") {
        return `<button type="button" class="chico secundario" data-accion="devolver" data-trabajador="${id}">Devolver</button>`
    }
    return `<button type="button" class="chico secundario" data-accion="editar" data-trabajador="${id}">${fila.resumen ? "Editar" : "Crear"}</button>
        ${fila.resumen ? `<button type="button" class="chico" data-accion="aprobar" data-trabajador="${id}">Aprobar</button>` : ""}`
}

async function cargarResumenes() {
    document.getElementById("panelEditar").hidden = true
    const periodo = periodoElegido()
    if (!periodo) {
        filas = []
        tabla.mostrar([])
        return
    }

    const resultado = await llamarApi(`/api/resumenes-asistencia?periodo_id=${periodo.id}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar los resúmenes")
        return
    }
    const resumenPorTrabajador = new Map(resultado.datos.map((r) => [r.trabajador_id, r]))

    // Trabajadores del mes, más cualquiera que ya tenga resumen aunque no calce con la regla.
    const delMes = datosTrabajadores.trabajadores.filter((t) => vigenteEnPeriodo(t, periodo) || resumenPorTrabajador.has(t.id))
    filas = delMes.map((trabajador) => {
        const resumen = resumenPorTrabajador.get(trabajador.id) ?? null
        return { trabajador, resumen, estado: resumen?.estado ?? "sin_resumen" }
    })
    tabla.mostrar(filas)
}

function abrirEdicion(fila) {
    filaEnEdicion = fila
    const r = fila.resumen ?? {}
    document.getElementById("tituloEditar").textContent = `${fila.resumen ? "Editar" : "Crear"} resumen de ${fila.trabajador.nombre}`
    document.getElementById("diasInasistencia").value = r.dias_inasistencia ?? 0
    document.getElementById("diasPermiso").value = r.dias_permiso_sin_goce ?? 0
    document.getElementById("diasVacaciones").value = r.dias_vacaciones ?? 0
    document.getElementById("minutosAtraso").value = r.minutos_atraso ?? 0
    const panel = document.getElementById("panelEditar")
    panel.hidden = false
    panel.scrollIntoView({ behavior: "smooth", block: "start" })
}

document.getElementById("cancelarEditar").addEventListener("click", () => { document.getElementById("panelEditar").hidden = true })

document.getElementById("formResumen").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const numero = (id) => Number(document.getElementById(id).value)

    const resultado = await llamarApi("/api/resumenes-asistencia", {
        method: "PUT",
        body: JSON.stringify({
            periodo_id: Number(selectorPeriodo.value),
            trabajador_id: filaEnEdicion.trabajador.id,
            dias_inasistencia: numero("diasInasistencia"),
            dias_permiso_sin_goce: numero("diasPermiso"),
            dias_vacaciones: numero("diasVacaciones"),
            minutos_atraso: numero("minutosAtraso")
        })
    })
    if (resultado.status !== 200 && resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo guardar el resumen")
        return
    }
    mensaje("info", `Resumen de ${filaEnEdicion.trabajador.nombre} guardado. Recuerda aprobarlo.`)
    cargarResumenes()
})

document.getElementById("tablaResumenes").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-accion]")
    if (!boton) {
        return
    }
    const fila = filas.find((f) => String(f.trabajador.id) === boton.dataset.trabajador)
    limpiarMensajes()

    if (boton.dataset.accion === "editar") {
        abrirEdicion(fila)
        return
    }
    const ruta = `/api/resumenes-asistencia/${fila.resumen.id}/${boton.dataset.accion === "aprobar" ? "aprobar" : "devolver"}`
    const resultado = await llamarApi(ruta, { method: "PATCH" })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo completar la acción")
        return
    }
    mensaje("info", boton.dataset.accion === "aprobar" ? "Resumen aprobado." : "Resumen devuelto a pendiente.")
    cargarResumenes()
})

document.getElementById("btnGenerar").addEventListener("click", async function () {
    limpiarMensajes()
    const periodo = periodoElegido()
    if (!periodo || !confirm(`¿Generar los resúmenes de ${nombrePeriodo(periodo)} desde la asistencia? Los pendientes se actualizan; los aprobados no cambian.`)) {
        return
    }
    this.disabled = true
    const resultado = await llamarApi("/api/resumenes-asistencia/generar", { method: "POST", body: JSON.stringify({ periodo_id: periodo.id }) })
    this.disabled = false
    if (resultado.status !== 200 && resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo generar")
        return
    }
    const resultados = Array.isArray(resultado.datos) ? resultado.datos : []
    const horas = resultados.reduce((suma, r) => suma + (Number(r.horas_extra) || 0), 0)
    mensaje("info", `Resúmenes generados para ${resultados.length} trabajador(es).${horas > 0 ? ` Se propusieron ${horas} horas extra como variables pendientes: revísalas en Variables.` : ""}`)
    cargarResumenes()
})

document.getElementById("btnAprobarTodos").addEventListener("click", async function () {
    limpiarMensajes()
    const pendientes = filas.filter((f) => f.estado === "pendiente")
    const sinResumen = filas.filter((f) => f.estado === "sin_resumen")
    if (pendientes.length === 0) {
        mensaje("info", sinResumen.length ? `No hay resúmenes pendientes. Faltan ${sinResumen.length} trabajador(es) sin resumen: créalos o usa "Generar".` : "No hay resúmenes pendientes.")
        return
    }
    if (!confirm(`¿Aprobar ${pendientes.length} resumen(es) pendiente(s)?`)) {
        return
    }
    const { hechos, errores } = await enLote(pendientes,
        (f) => llamarApi(`/api/resumenes-asistencia/${f.resumen.id}/aprobar`, { method: "PATCH" }),
        (f) => f.trabajador.nombre)
    mensaje("info", `Se aprobaron ${hechos} resumen(es).${sinResumen.length ? ` Faltan ${sinResumen.length} trabajador(es) sin resumen.` : ""}`)
    if (errores.length) {
        mensaje("error", "No se pudieron aprobar:")
        mostrarProblemasConNombre(errores)
    }
    cargarResumenes()
})

selectorPeriodo.addEventListener("change", () => { limpiarMensajes(); cargarResumenes() })

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    datosTrabajadores = (await trabajadoresDeLaEmpresa()) ?? datosTrabajadores
    periodos = await llenarSelectorPeriodos(selectorPeriodo)
    cargarResumenes()
})
