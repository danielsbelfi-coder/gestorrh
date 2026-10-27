requiereLogin()

let periodos = []
let trabajadores = []
let personaPorId = new Map()
let liquidaciones = []

const selectorPeriodo = document.getElementById("periodo")

function periodoElegido() {
    return periodos.find((periodo) => String(periodo.id) === selectorPeriodo.value) ?? null
}

function nombreDe(trabajadorId) {
    const trabajador = trabajadores.find((t) => t.id === trabajadorId)
    return nombreCompleto(personaPorId.get(trabajador?.persona_id)) || `Trabajador ${trabajadorId}`
}

function rutDe(trabajadorId) {
    const persona = personaPorId.get(trabajadores.find((t) => t.id === trabajadorId)?.persona_id)
    return persona ? formatearRut(persona.rut, persona.dv) : ""
}

const tabla = crearTabla({
    contenedor: "tablaLiquidaciones",
    textoBuscar: "Buscar por nombre o RUT…",
    vacio: "Todavía no hay liquidaciones calculadas en este periodo.",
    columnas: [
        { titulo: "Trabajador", valor: (l) => nombreDe(l.trabajador_id) },
        { titulo: "RUT", valor: (l) => rutDe(l.trabajador_id) },
        { titulo: "Versión", valor: (l) => l.version, numero: true },
        { titulo: "Estado", valor: (l) => textoEstado("liquidacion", l.estado), html: (l) => insignia("liquidacion", l.estado) },
        { titulo: "Haberes", valor: (l) => Number(l.total_haberes), html: (l) => escaparHtml(pesos(l.total_haberes)), numero: true },
        { titulo: "Descuentos", valor: (l) => Number(l.total_descuentos), html: (l) => escaparHtml(pesos(l.total_descuentos)), numero: true },
        { titulo: "Líquido", valor: (l) => Number(l.liquido_a_pagar), html: (l) => `<strong>${escaparHtml(pesos(l.liquido_a_pagar))}</strong>`, numero: true },
        {
            titulo: "", orden: false, valor: () => "",
            html: (l) => `
                <button type="button" class="chico secundario" data-accion="detalle" data-id="${l.id}">Detalle</button>
                ${l.estado === "calculada"
                    ? `<button type="button" class="chico" data-accion="emitir" data-id="${l.id}">Cerrar liquidación</button>`
                    : `<button type="button" class="chico secundario" data-accion="recalcular" data-id="${l.id}">Recalcular</button>`}
                <button type="button" class="chico secundario" data-accion="pdf" data-id="${l.id}">PDF</button>
                <button type="button" class="chico secundario" data-accion="pdf-aportes" data-id="${l.id}">PDF con aportes</button>`
        }
    ],
    filtros: [{ titulo: "Estado", valor: (l) => l.estado, opciones: opcionesDe("liquidacion") }]
})

async function cargarTrabajadores() {
    const listas = await cargarListas(["/api/trabajadores", "/api/personas"])
    if (!listas) {
        return
    }
    trabajadores = deEmpresaActual(listas[0])
    personaPorId = porId(listas[1])

    llenarBuscador(document.getElementById("trabajador"), trabajadores
        .filter((t) => t.estado !== "postulante")
        .map((t) => {
            const persona = personaPorId.get(t.persona_id)
            return { id: t.id, texto: `${persona ? textoPersona(persona) : "Trabajador " + t.id} · #${t.id}` }
        }))
}

async function cargarLiquidaciones() {
    document.getElementById("detalle").hidden = true
    const periodo = periodoElegido()

    if (!periodo) {
        liquidaciones = []
        tabla.mostrar([])
        mensaje("info", "Esta empresa no tiene periodos. Ábrelo en Periodos.")
        return
    }

    const resultado = await llamarApi(`/api/periodos-remuneracion/${periodo.id}/liquidaciones`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar las liquidaciones")
        return
    }

    liquidaciones = resultado.datos
    tabla.mostrar(liquidaciones)
}

function filaDetalle(texto, valor, clase = "") {
    return `<tr class="${clase}"><td>${escaparHtml(texto)}</td><td class="numero">${escaparHtml(pesos(valor))}</td></tr>`
}

function mostrarDetalle(liquidacion) {
    const panel = document.getElementById("detalle")
    panel.innerHTML = `
        <div class="encabezado-pagina">
            <div>
                <h2>${escaparHtml(nombreDe(liquidacion.trabajador_id))}</h2>
                <p>${escaparHtml(nombrePeriodo(periodoElegido()))} · versión ${escaparHtml(liquidacion.version)} · ${escaparHtml(textoEstado("liquidacion", liquidacion.estado))}</p>
            </div>
            <button type="button" class="secundario chico" id="cerrarDetalle">Cerrar detalle</button>
        </div>
        <div class="rejilla">
            <table>
                <thead><tr><th>Haberes</th><th class="numero">Monto</th></tr></thead>
                <tbody>
                    ${filaDetalle("Sueldo proporcional", liquidacion.sueldo_base_proporcional)}
                    ${filaDetalle("Horas extra", liquidacion.monto_horas_extra)}
                    ${filaDetalle("Gratificación", liquidacion.monto_gratificacion)}
                    ${filaDetalle("Total haberes", liquidacion.total_haberes, "total")}
                </tbody>
            </table>
            <table>
                <thead><tr><th>Descuentos</th><th class="numero">Monto</th></tr></thead>
                <tbody>
                    ${filaDetalle("AFP", liquidacion.descuento_afp)}
                    ${filaDetalle("Salud", liquidacion.descuento_salud)}
                    ${filaDetalle("Seguro de cesantía", liquidacion.descuento_cesantia)}
                    ${filaDetalle("Impuesto único", liquidacion.monto_impuesto_unico)}
                    ${filaDetalle("Total descuentos", liquidacion.total_descuentos, "total")}
                </tbody>
            </table>
        </div>
        <p class="liquido">Líquido a pagar: <strong>${escaparHtml(pesos(liquidacion.liquido_a_pagar))}</strong></p>
        <p class="texto-suave">El detalle completo, con todos los conceptos, está en el PDF.</p>`
    panel.hidden = false
    panel.querySelector("#cerrarDetalle").addEventListener("click", () => { panel.hidden = true })
    panel.scrollIntoView({ behavior: "smooth", block: "start" })
}

async function calcularUna(periodoId, trabajadorId) {
    return await llamarApi(`/api/periodos-remuneracion/${periodoId}/liquidaciones`, {
        method: "POST",
        body: JSON.stringify({ trabajador_id: trabajadorId })
    })
}

document.getElementById("formCalcular").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const trabajadorId = valorBuscador(document.getElementById("trabajador"))
    if (trabajadorId === null) {
        mensaje("error", "Elige un trabajador de la lista de sugerencias")
        return
    }

    const resultado = await calcularUna(selectorPeriodo.value, trabajadorId)
    if (resultado.status !== 200 && resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo calcular")
        return
    }

    const texto = resultado.status === 201 ? "Liquidación calculada." : "Borrador recalculado."
    mensaje("info", [texto, ...(resultado.datos.advertencias ?? [])].join(" "))
    this.reset()
    cargarLiquidaciones()
})

// Calcula (o vuelve a calcular el borrador de) cada trabajador contratado en el mes, de a uno.
// Se saltan los que ya tienen la liquidación cerrada.
document.getElementById("btnCalcularTodas").addEventListener("click", async function () {
    limpiarMensajes()
    const periodo = periodoElegido()
    if (!periodo) {
        return
    }

    const cerradas = new Set(liquidaciones.filter((l) => l.estado === "emitida").map((l) => l.trabajador_id))
    const pendientes = trabajadores.filter((t) => vigenteEnPeriodo(t, periodo) && !cerradas.has(t.id))

    if (pendientes.length === 0) {
        mensaje("info", "No hay liquidaciones por calcular: todos los trabajadores del mes ya tienen su liquidación cerrada.")
        return
    }

    if (!confirm(`¿Calcular las liquidaciones de ${pendientes.length} trabajador(es) de ${nombrePeriodo(periodo)}? Los borradores existentes se vuelven a calcular.`)) {
        return
    }

    const boton = this
    boton.disabled = true
    const problemas = []
    let calculadas = 0

    for (const [i, trabajador] of pendientes.entries()) {
        boton.textContent = `Calculando ${i + 1} de ${pendientes.length}…`
        const resultado = await calcularUna(periodo.id, trabajador.id)
        if (resultado.status === 200 || resultado.status === 201) {
            calculadas++
            if (resultado.datos.advertencias?.length) {
                problemas.push({ nombre: nombreDe(trabajador.id), motivos: resultado.datos.advertencias })
            }
        } else {
            problemas.push({ nombre: nombreDe(trabajador.id), motivos: [resultado.datos?.error ?? "Error al calcular"] })
        }
    }

    boton.disabled = false
    boton.textContent = "Calcular todas"
    mensaje("info", `Se calcularon ${calculadas} de ${pendientes.length} liquidación(es).`)
    if (problemas.length) {
        mensaje("error", "Revisa estos trabajadores (errores y advertencias):")
        mostrarProblemasConNombre(problemas)
    }
    cargarLiquidaciones()
})

document.getElementById("tablaLiquidaciones").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-accion]")
    if (!boton) {
        return
    }
    const { accion, id } = boton.dataset
    const liquidacion = liquidaciones.find((l) => String(l.id) === id)

    limpiarMensajes()
    const base = `/api/periodos-remuneracion/${selectorPeriodo.value}/liquidaciones/${id}`

    if (accion === "detalle") {
        mostrarDetalle(liquidacion)
        return
    }

    if (accion === "pdf" || accion === "pdf-aportes") {
        const resultado = await descargarArchivo(`${base}/documento${accion === "pdf-aportes" ? "?con_aportes=1" : ""}`)
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo descargar")
        }
        return
    }

    if (accion === "emitir") {
        if (!confirm(`¿Cerrar la liquidación de ${nombreDe(liquidacion.trabajador_id)}? Después solo se podrá modificar con un recálculo.`)) {
            return
        }
        const resultado = await llamarApi(`${base}/emitir`, { method: "POST" })
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo cerrar")
            return
        }
        mensaje("info", "Liquidación cerrada.")
    }

    if (accion === "recalcular") {
        const motivo = prompt(`Motivo del recálculo de ${nombreDe(liquidacion.trabajador_id)}:`)
        if (motivo === null) {
            return
        }
        const resultado = await llamarApi(`${base}/recalcular`, { method: "POST", body: JSON.stringify({ motivo }) })
        if (resultado.status !== 201) {
            mensaje("error", resultado.datos?.error ?? "No se pudo recalcular")
            return
        }
        mensaje("info", ["Nueva versión creada como borrador.", ...(resultado.datos.advertencias ?? [])].join(" "))
    }

    cargarLiquidaciones()
})

document.getElementById("btnEmitirTodas").addEventListener("click", async function () {
    limpiarMensajes()

    if (!confirm("¿Cerrar todas las liquidaciones por cerrar del periodo? Si alguna tiene pendientes, no se cerrará ninguna.")) {
        return
    }

    const resultado = await llamarApi(`/api/periodos-remuneracion/${selectorPeriodo.value}/liquidaciones/emitir`, { method: "POST" })

    if (resultado.status === 409 && resultado.datos.problemas) {
        mensaje("error", "No se cerró ninguna liquidación. Resuelve estos pendientes:")
        mostrarProblemasConNombre(resultado.datos.problemas.map((p) => ({
            nombre: nombreDe(p.trabajador_id),
            motivos: p.motivos ?? [p.motivo]
        })))
        return
    }

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cerrar")
        return
    }

    mensaje("info", `Se cerraron ${resultado.datos.emitidas} liquidación(es).`)
    cargarLiquidaciones()
})

async function descargarTodas(conAportes) {
    limpiarMensajes()
    const resultado = await descargarArchivo(`/api/periodos-remuneracion/${selectorPeriodo.value}/liquidaciones/documento${conAportes ? "?con_aportes=1" : ""}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo descargar")
    }
}

document.getElementById("btnPdfTodas").addEventListener("click", () => descargarTodas(false))
document.getElementById("btnPdfTodasAportes").addEventListener("click", () => descargarTodas(true))
selectorPeriodo.addEventListener("change", () => { limpiarMensajes(); cargarLiquidaciones() })

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    await cargarTrabajadores()
    periodos = await llenarSelectorPeriodos(selectorPeriodo)
    cargarLiquidaciones()
})
