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
        { titulo: "Mes de origen", valor: (v) => v.mes_origen ?? "", html: (v) => v.mes_origen ? escaparHtml(v.mes_origen.slice(5, 7) + "-" + v.mes_origen.slice(0, 4)) : "" },
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
    // Las agrega una permanente o un préstamo en cuotas: se cambian en esa sección.
    if (v.recurrente_id) {
        return `<span class="texto-suave">Ver «Permanentes y préstamos»</span>`
    }
    if (v.estado === "aprobada") {
        // Una variable aprobada se puede desaprobar (vuelve a pendiente para editarla) o eliminar (ADMIN o JEFE_RRHH).
        return `<button type="button" class="chico secundario" data-accion="devolver" data-id="${v.id}">Desaprobar</button>
            <button type="button" class="chico peligro" data-accion="eliminar" data-id="${v.id}">Eliminar</button>`
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
        && (!c.calculado_por_sistema || esHoras(c) || c.codigo === "DESCUENTO_PAGO_EXCESO"))
    llenarSelect(document.getElementById("concepto"), ingresables.map((c) => ({
        id: c.id,
        texto: `${c.nombre} (${c.tipo === "descuento" ? "descuento" : esHoras(c) ? "horas" : "haber"})`
    })), "Elige el concepto")
    conceptosRecurrentes = resultado.datos.filter((c) => c.activo !== false && ["haber", "descuento"].includes(c.tipo)
        && !c.calculado_por_sistema && !esHoras(c))
    ajustarFormRecurrente()
}

// ---------- Permanentes y préstamos en cuotas ----------
let conceptosRecurrentes = []
let recurrentes = []
let recurrenteEnEdicion = null
const formRecurrente = document.getElementById("formRecurrente")
const mesCorto = (iso) => (iso ? `${iso.slice(5, 7)}-${iso.slice(0, 4)}` : "")

function ajustarFormRecurrente() {
    const cuotas = document.getElementById("recTipo").value === "cuotas"
    const selector = document.getElementById("recConcepto")
    const elegido = selector.value
    const opciones = conceptosRecurrentes.filter((c) => !cuotas || c.tipo === "descuento")
    llenarSelect(selector, opciones.map((c) => ({ id: c.id, texto: `${c.nombre} (${c.tipo})` })), "Elige el concepto")
    if (opciones.some((c) => String(c.id) === elegido)) {
        selector.value = elegido
    } else if (cuotas) {
        const prestamo = opciones.find((c) => c.codigo === "PRESTAMO_EMPRESA")
        if (prestamo) {
            selector.value = prestamo.id
        }
    }
    document.getElementById("etiquetaRecMonto").firstChild.textContent = cuotas ? "Monto total del préstamo ($)" : "Monto mensual ($)"
    document.getElementById("etiquetaRecCuotas").hidden = !cuotas
    document.getElementById("recCuotas").required = cuotas
    document.getElementById("etiquetaRecHasta").hidden = cuotas
    document.getElementById("etiquetaRecProporcional").hidden = cuotas
    document.getElementById("ayudaRec").textContent = cuotas
        ? "Una cuota por mes desde el mes indicado (la última ajusta el redondeo). Si la relación termina antes, el finiquito propone descontar el saldo."
        : "Sin «hasta», sigue hasta el término de la relación. Proporcional: el monto se ajusta a los días pagados del mes (sobre 30)."
}

document.getElementById("recTipo").addEventListener("change", ajustarFormRecurrente)

function textoMonto(r) {
    if (r.tipo === "cuotas") {
        const base = Math.floor(r.monto / r.cuotas)
        return `${pesos(r.monto)} en ${r.cuotas} cuota(s) de ${pesos(base)}`
    }
    return `${pesos(r.monto)} al mes${r.proporcional ? " (proporcional)" : ""}`
}

function textoVigencia(r) {
    if (r.tipo === "cuotas") {
        const ultimo = new Date(Date.UTC(Number(r.desde_mes.slice(0, 4)), Number(r.desde_mes.slice(5, 7)) - 1 + r.cuotas - 1, 1))
        return `${mesCorto(r.desde_mes)} a ${String(ultimo.getUTCMonth() + 1).padStart(2, "0")}-${ultimo.getUTCFullYear()}`
    }
    return `${mesCorto(r.desde_mes)} a ${r.hasta_mes ? mesCorto(r.hasta_mes) : "el término"}`
}

function textoAplicada(r) {
    if (r.aplicadas.length === 0) {
        return "Todavía no"
    }
    const meses = r.aplicadas.map((a) => `${mesCorto(a.mes)}${a.numero_cuota ? ` (cuota ${a.numero_cuota})` : ""}${a.cerrado ? "" : " abierto"}`)
    return meses.join(", ")
}

const tablaRecurrentes = crearTabla({
    contenedor: "tablaRecurrentes",
    textoBuscar: "Buscar por trabajador, concepto o glosa…",
    vacio: "No hay variables permanentes ni préstamos en cuotas.",
    columnas: [
        { titulo: "Trabajador", valor: (r) => datosTrabajadores.porId.get(r.trabajador_id)?.nombre ?? `Trabajador ${r.trabajador_id}` },
        { titulo: "Tipo", valor: (r) => (r.tipo === "cuotas" ? "Préstamo en cuotas" : "Permanente") },
        { titulo: "Concepto", valor: (r) => r.concepto?.nombre ?? "" },
        { titulo: "Monto", valor: (r) => r.monto, html: (r) => escaparHtml(textoMonto(r)), numero: true },
        { titulo: "Vigencia", valor: (r) => r.desde_mes, html: (r) => escaparHtml(textoVigencia(r)) },
        { titulo: "Glosa", valor: (r) => r.glosa ?? "" },
        { titulo: "Aplicada en", valor: (r) => textoAplicada(r) },
        {
            titulo: "Saldo al término", valor: (r) => r.saldo_al_termino?.saldo ?? 0,
            html: (r) => r.saldo_al_termino ? escaparHtml(`${pesos(r.saldo_al_termino.saldo)} (${r.saldo_al_termino.pendientes} cuota(s))`) : ""
        },
        {
            titulo: "", orden: false, valor: () => "",
            html: (r) => `<button type="button" class="chico secundario" data-rec="editar" data-id="${r.id}">Editar</button>
                <button type="button" class="chico peligro" data-rec="eliminar" data-id="${r.id}">Eliminar</button>`
        }
    ]
})

async function cargarRecurrentes() {
    const resultado = await llamarApi(`/api/variables-recurrentes?empresa_id=${empresaActual()}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar las variables permanentes")
        return
    }
    recurrentes = resultado.datos
    tablaRecurrentes.mostrar(recurrentes)
}

function salirDeEdicionRecurrente() {
    recurrenteEnEdicion = null
    formRecurrente.reset()
    for (const id of ["recTrabajador", "recTipo", "recConcepto"]) {
        document.getElementById(id).disabled = false
    }
    document.getElementById("botonRecurrente").textContent = "Crear"
    document.getElementById("cancelarRecurrente").hidden = true
    ajustarFormRecurrente()
}

document.getElementById("cancelarRecurrente").addEventListener("click", salirDeEdicionRecurrente)

formRecurrente.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const tipo = document.getElementById("recTipo").value
    const cuerpo = {
        monto: Number(document.getElementById("recMonto").value),
        desde_mes: document.getElementById("recDesde").value,
        glosa: document.getElementById("recGlosa").value.trim() || null,
        ...(tipo === "cuotas"
            ? { cuotas: Number(document.getElementById("recCuotas").value) }
            : { hasta_mes: document.getElementById("recHasta").value || null, proporcional: document.getElementById("recProporcional").checked })
    }
    let resultado
    if (recurrenteEnEdicion) {
        resultado = await llamarApi(`/api/variables-recurrentes/${recurrenteEnEdicion.id}`, { method: "PATCH", body: JSON.stringify(cuerpo) })
    } else {
        const trabajadorId = valorBuscador(document.getElementById("recTrabajador"))
        if (trabajadorId === null) {
            mensaje("error", "Elige un trabajador de la lista de sugerencias")
            return
        }
        resultado = await llamarApi("/api/variables-recurrentes", {
            method: "POST",
            body: JSON.stringify({ ...cuerpo, tipo, trabajador_id: trabajadorId, concepto_id: Number(document.getElementById("recConcepto").value) })
        })
    }
    if (resultado.status !== 200 && resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo guardar")
        return
    }
    mensaje("info", recurrenteEnEdicion
        ? "Cambio guardado. Se aplicó a los meses abiertos; si una liquidación ya estaba calculada, recalcúlala."
        : "Creada y aprobada. Ya está en los meses abiertos que le tocan; si una liquidación ya estaba calculada, recalcúlala.")
    salirDeEdicionRecurrente()
    await cargarRecurrentes()
    cargarVariables()
})

document.getElementById("tablaRecurrentes").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-rec]")
    if (!boton) {
        return
    }
    limpiarMensajes()
    const r = recurrentes.find((x) => String(x.id) === boton.dataset.id)
    if (boton.dataset.rec === "editar") {
        recurrenteEnEdicion = r
        document.getElementById("recTrabajador").value = datosTrabajadores.porId.get(r.trabajador_id)?.textoBuscador ?? ""
        document.getElementById("recTipo").value = r.tipo
        ajustarFormRecurrente()
        document.getElementById("recConcepto").value = r.concepto_id
        for (const id of ["recTrabajador", "recTipo", "recConcepto"]) {
            document.getElementById(id).disabled = true
        }
        document.getElementById("recMonto").value = r.monto
        document.getElementById("recCuotas").value = r.cuotas ?? ""
        document.getElementById("recDesde").value = r.desde_mes.slice(0, 7)
        document.getElementById("recHasta").value = r.hasta_mes ? r.hasta_mes.slice(0, 7) : ""
        document.getElementById("recProporcional").checked = r.proporcional
        document.getElementById("recGlosa").value = r.glosa ?? ""
        document.getElementById("botonRecurrente").textContent = "Guardar cambios"
        document.getElementById("cancelarRecurrente").hidden = false
        return
    }
    if (!confirm("¿Eliminar? Se quitan sus variables de los meses abiertos. Si ya se aplicó en un mes cerrado no se puede: termínala con «hasta».")) {
        return
    }
    const resultado = await llamarApi(`/api/variables-recurrentes/${r.id}`, { method: "DELETE" })
    if (resultado.status !== 204 && resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo eliminar")
        return
    }
    mensaje("info", "Eliminada. Si una liquidación ya estaba calculada, recalcúlala.")
    await cargarRecurrentes()
    cargarVariables()
})

function ajustarCampoValor() {
    const concepto = conceptoPorId.get(Number(document.getElementById("concepto").value))
    const etiqueta = document.getElementById("etiquetaValor")
    const entrada = document.getElementById("valor")
    etiqueta.firstChild.textContent = esHoras(concepto) ? "Horas" : "Monto ($)"
    entrada.step = esHoras(concepto) ? "0.01" : "1"
    // Horas extra manuales: solo de un mes ya cerrado (las propuestas del libro no llevan mes de origen).
    const pideMes = esHoras(concepto) && variableEnEdicion?.fuente !== "asistencia"
    document.getElementById("etiquetaMesOrigen").hidden = !pideMes
    document.getElementById("mesOrigen").required = pideMes
    document.getElementById("ayudaHoras").hidden = !esHoras(concepto)
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
        ...(esHoras(concepto) ? { cantidad: valor } : { monto: valor }),
        ...(esHoras(concepto) && variableEnEdicion?.fuente !== "asistencia" ? { mes_origen: document.getElementById("mesOrigen").value || null } : {})
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
        document.getElementById("mesOrigen").value = variable.mes_origen ? variable.mes_origen.slice(0, 7) : ""
        document.getElementById("botonGuardar").textContent = "Guardar cambios"
        document.getElementById("cancelarEdicion").hidden = false
        document.getElementById("panelCrear").open = true
        document.getElementById("panelCrear").scrollIntoView({ behavior: "smooth", block: "start" })
        return
    }

    const aprobadaAEliminar = boton.dataset.accion === "eliminar" && variable.estado === "aprobada"
    if (boton.dataset.accion === "eliminar" && !confirm(aprobadaAEliminar
        ? "Esta variable está APROBADA. ¿Eliminarla? Si la liquidación del trabajador ya está calculada, recalcúlala después."
        : "¿Eliminar esta variable?")) {
        return
    }

    const acciones = {
        eliminar: [`/api/variables/${variable.id}`, "DELETE", "Variable eliminada."],
        aprobar: [`/api/variables/${variable.id}/aprobar`, "PATCH", "Variable aprobada."],
        devolver: [`/api/variables/${variable.id}/devolver`, "PATCH", "Variable desaprobada: quedó pendiente. Si la liquidación ya está calculada, recalcúlala después de aprobar."]
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

// Solo los trabajadores con relación laboral en el mes del periodo elegido.
function llenarTrabajadoresDelPeriodo() {
    const periodo = periodoElegido()
    llenarBuscador(document.getElementById("trabajador"), (datosTrabajadores?.trabajadores ?? [])
        .filter((t) => periodo !== null && vigenteEnPeriodo(t, periodo))
        .map((t) => ({ id: t.id, texto: t.textoBuscador })))
}

selectorPeriodo.addEventListener("change", () => { limpiarMensajes(); salirDeEdicion(); llenarTrabajadoresDelPeriodo(); cargarVariables() })

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    datosTrabajadores = (await trabajadoresDeLaEmpresa()) ?? datosTrabajadores
    await cargarConceptos()
    periodos = await llenarSelectorPeriodos(selectorPeriodo)
    llenarTrabajadoresDelPeriodo()
    // Permanentes y préstamos: relaciones sin término (las que pueden recibir variables de aquí en adelante).
    llenarBuscador(document.getElementById("recTrabajador"), (datosTrabajadores?.trabajadores ?? [])
        .filter((t) => !t.fecha_termino && t.estado !== "postulante")
        .map((t) => ({ id: t.id, texto: t.textoBuscador })))
    salirDeEdicion()
    await cargarRecurrentes()
    cargarVariables()
})
