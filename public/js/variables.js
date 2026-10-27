requiereLogin()

const selectorPeriodo = document.getElementById("periodo")
const formulario = document.getElementById("formVariable")
let periodos = []
let datosTrabajadores = { trabajadores: [], porId: new Map() }
let conceptoPorId = new Map()
let variables = []
let variableEnEdicion = null

function periodoElegido() {
    return periodos.find((p) => String(p.id) === selectorPeriodo.value) ?? null
}

function esHoras(concepto) {
    return concepto?.recargo_hora_extra !== null && concepto?.recargo_hora_extra !== undefined
}

function valorVariable(v) {
    return esHoras(conceptoPorId.get(v.concepto_id)) ? `${Number(v.cantidad).toLocaleString("es-CL")} h` : pesos(v.monto)
}

const tabla = crearTabla({
    contenedor: "tablaVariables",
    textoBuscar: "Buscar por trabajador, concepto o glosa…",
    vacio: "No hay variables en este periodo.",
    columnas: [
        { titulo: "Trabajador", valor: (v) => datosTrabajadores.porId.get(v.trabajador_id)?.nombre ?? `Trabajador ${v.trabajador_id}` },
        { titulo: "Concepto", valor: (v) => conceptoPorId.get(v.concepto_id)?.nombre ?? `Concepto ${v.concepto_id}` },
        { titulo: "Tipo", valor: (v) => conceptoPorId.get(v.concepto_id)?.tipo === "descuento" ? "Descuento" : "Haber" },
        { titulo: "Valor", valor: (v) => Number(v.monto ?? v.cantidad ?? 0), html: (v) => escaparHtml(valorVariable(v)), numero: true },
        { titulo: "Glosa", valor: (v) => v.glosa ?? "" },
        { titulo: "Fuente", valor: (v) => TEXTOS.fuenteRegistro[v.fuente] ?? v.fuente },
        { titulo: "Estado", valor: (v) => textoEstado("variable", v.estado), html: (v) => insignia("variable", v.estado) },
        { titulo: "", orden: false, valor: () => "", html: botones }
    ],
    filtros: [{ titulo: "Estado", valor: (v) => v.estado, opciones: opcionesDe("variable") }]
})

function botones(v) {
    if (periodoElegido()?.estado !== "abierto") {
        return ""
    }
    if (v.estado === "aprobada") {
        return `<button type="button" class="chico secundario" data-accion="devolver" data-id="${v.id}">Devolver</button>`
    }
    return `<button type="button" class="chico secundario" data-accion="editar" data-id="${v.id}">Editar</button>
        <button type="button" class="chico secundario" data-accion="eliminar" data-id="${v.id}">Eliminar</button>
        <button type="button" class="chico" data-accion="aprobar" data-id="${v.id}">Aprobar</button>`
}

async function cargarConceptos() {
    const resultado = await llamarApi(`/api/conceptos?empresa_id=${empresaActual()}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar los conceptos")
        return
    }
    conceptoPorId = porId(resultado.datos)
    // Solo los que se ingresan a mano: activos, haberes o descuentos, y no calculados por el sistema (salvo horas extra).
    const ingresables = resultado.datos.filter((c) => c.activo !== false && c.tipo !== "aporte_empleador"
        && (!c.calculado_por_sistema || esHoras(c)))
    llenarSelect(document.getElementById("concepto"), ingresables.map((c) => ({
        id: c.id,
        texto: `${c.nombre} (${c.tipo === "descuento" ? "descuento" : esHoras(c) ? "horas" : "haber"})`
    })), "Elige el concepto")
}

function ajustarCampoValor() {
    const concepto = conceptoPorId.get(Number(document.getElementById("concepto").value))
    const etiqueta = document.getElementById("etiquetaValor")
    const entrada = document.getElementById("valor")
    etiqueta.firstChild.textContent = esHoras(concepto) ? "Horas" : "Monto ($)"
    entrada.step = esHoras(concepto) ? "0.01" : "1"
}

document.getElementById("concepto").addEventListener("change", ajustarCampoValor)

async function cargarVariables() {
    const periodo = periodoElegido()
    if (!periodo) {
        variables = []
        tabla.mostrar([])
        return
    }
    const resultado = await llamarApi(`/api/variables?periodo_id=${periodo.id}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar las variables")
        return
    }
    variables = resultado.datos
    tabla.mostrar(variables)
}

function salirDeEdicion() {
    variableEnEdicion = null
    formulario.reset()
    document.getElementById("trabajador").disabled = false
    document.getElementById("concepto").disabled = false
    document.getElementById("botonGuardar").textContent = "Agregar"
    document.getElementById("cancelarEdicion").hidden = true
    ajustarCampoValor()
}

document.getElementById("cancelarEdicion").addEventListener("click", salirDeEdicion)

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const conceptoId = variableEnEdicion ? variableEnEdicion.concepto_id : Number(document.getElementById("concepto").value)
    const concepto = conceptoPorId.get(conceptoId)
    const valor = Number(document.getElementById("valor").value)
    const cuerpo = {
        glosa: document.getElementById("glosa").value.trim() || null,
        ...(esHoras(concepto) ? { cantidad: valor } : { monto: valor })
    }

    let resultado
    if (variableEnEdicion) {
        resultado = await llamarApi(`/api/variables/${variableEnEdicion.id}`, { method: "PATCH", body: JSON.stringify(cuerpo) })
    } else {
        const trabajadorId = valorBuscador(document.getElementById("trabajador"))
        if (trabajadorId === null) {
            mensaje("error", "Elige un trabajador de la lista de sugerencias")
            return
        }
        resultado = await llamarApi("/api/variables", {
            method: "POST",
            body: JSON.stringify({ ...cuerpo, periodo_id: Number(selectorPeriodo.value), trabajador_id: trabajadorId, concepto_id: conceptoId })
        })
    }

    if (resultado.status !== 200 && resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo guardar la variable")
        return
    }
    mensaje("info", variableEnEdicion ? "Variable modificada." : "Variable agregada como pendiente.")
    salirDeEdicion()
    cargarVariables()
})

document.getElementById("tablaVariables").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-accion]")
    if (!boton) {
        return
    }
    const variable = variables.find((v) => String(v.id) === boton.dataset.id)
    limpiarMensajes()

    if (boton.dataset.accion === "editar") {
        variableEnEdicion = variable
        const trabajador = datosTrabajadores.porId.get(variable.trabajador_id)
        document.getElementById("trabajador").value = trabajador?.textoBuscador ?? ""
        document.getElementById("trabajador").disabled = true
        document.getElementById("concepto").value = variable.concepto_id
        document.getElementById("concepto").disabled = true
        ajustarCampoValor()
        document.getElementById("valor").value = variable.monto ?? variable.cantidad ?? ""
        document.getElementById("glosa").value = variable.glosa ?? ""
        document.getElementById("botonGuardar").textContent = "Guardar cambios"
        document.getElementById("cancelarEdicion").hidden = false
        document.getElementById("panelCrear").open = true
        document.getElementById("panelCrear").scrollIntoView({ behavior: "smooth", block: "start" })
        return
    }

    if (boton.dataset.accion === "eliminar" && !confirm("¿Eliminar esta variable?")) {
        return
    }

    const acciones = {
        eliminar: [`/api/variables/${variable.id}`, "DELETE", "Variable eliminada."],
        aprobar: [`/api/variables/${variable.id}/aprobar`, "PATCH", "Variable aprobada."],
        devolver: [`/api/variables/${variable.id}/devolver`, "PATCH", "Variable devuelta a pendiente."]
    }
    const [ruta, metodo, texto] = acciones[boton.dataset.accion]
    const resultado = await llamarApi(ruta, { method: metodo })
    if (resultado.status !== 200 && resultado.status !== 204) {
        mensaje("error", resultado.datos?.error ?? "No se pudo completar la acción")
        return
    }
    mensaje("info", texto)
    cargarVariables()
})

document.getElementById("btnAprobarTodas").addEventListener("click", async function () {
    limpiarMensajes()
    const pendientes = variables.filter((v) => v.estado === "pendiente")
    if (pendientes.length === 0) {
        mensaje("info", "No hay variables pendientes.")
        return
    }
    if (!confirm(`¿Aprobar ${pendientes.length} variable(s) pendiente(s)?`)) {
        return
    }
    const { hechos, errores } = await enLote(pendientes,
        (v) => llamarApi(`/api/variables/${v.id}/aprobar`, { method: "PATCH" }),
        (v) => datosTrabajadores.porId.get(v.trabajador_id)?.nombre ?? `Trabajador ${v.trabajador_id}`)
    mensaje("info", `Se aprobaron ${hechos} variable(s).`)
    if (errores.length) {
        mensaje("error", "No se pudieron aprobar:")
        mostrarProblemasConNombre(errores)
    }
    cargarVariables()
})

selectorPeriodo.addEventListener("change", () => { limpiarMensajes(); salirDeEdicion(); cargarVariables() })

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    datosTrabajadores = (await trabajadoresDeLaEmpresa()) ?? datosTrabajadores
    llenarBuscador(document.getElementById("trabajador"), datosTrabajadores.trabajadores
        .filter((t) => t.estado !== "postulante")
        .map((t) => ({ id: t.id, texto: t.textoBuscador })))
    await cargarConceptos()
    periodos = await llenarSelectorPeriodos(selectorPeriodo)
    salirDeEdicion()
    cargarVariables()
})
