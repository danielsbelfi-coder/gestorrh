requiereLogin()

const CODIGOS_DESCUENTO = [
    [3171, "3171 · Cuota sindical"],
    [3183, "3183 · Otros descuentos autorizados y solicitados por el trabajador"],
    [3185, "3185 · Seguro de cesantía"],
    [3186, "3186 · Retención judicial (pensión de alimentos)"],
    [3188, "3188 · Anticipo o pago en exceso"]
]

let filas = []
let trabajadorEnCalculo = null

const tabla = crearTabla({
    contenedor: "tablaFiniquitos",
    textoBuscar: "Buscar por nombre o RUT…",
    vacio: "No hay trabajadores con término registrado en esta empresa.",
    columnas: [
        { titulo: "Trabajador", valor: (f) => nombreCompleto(f.persona) },
        { titulo: "RUT", valor: (f) => formatearRut(f.persona?.rut, f.persona?.dv) },
        { titulo: "Término", valor: (f) => f.trabajador.fecha_termino, html: (f) => escaparHtml(fechaCorta(f.trabajador.fecha_termino)) },
        {
            titulo: "Causal", valor: (f) => CAUSALES[f.trabajador.causal_termino] ?? "",
            html: (f) => `<span title="${escaparHtml(CAUSALES[f.trabajador.causal_termino] ?? "")}">${escaparHtml((CAUSALES[f.trabajador.causal_termino] ?? "Sin causal").split(":")[0])}</span>`
        },
        {
            titulo: "Finiquito", valor: (f) => textoEstado("finiquito", f.estado),
            html: (f) => insignia("finiquito", f.estado) + (f.finiquito?.saldo_desactualizado
                ? ` <span class="insignia peligro" title="La liquidación del mes ahora deja un saldo de pago en exceso de ${escaparHtml(pesos(f.finiquito.saldo_liquidacion))}">Recalcular: cambió el saldo de la liquidación</span>`
                : "")
        },
        { titulo: "Total a pagar", valor: (f) => f.finiquito ? Number(f.finiquito.total_a_pagar) : 0, html: (f) => f.finiquito ? `<strong>${escaparHtml(pesos(f.finiquito.total_a_pagar))}</strong>` : "", numero: true },
        { titulo: "", orden: false, valor: () => "", html: botones }
    ],
    filtros: [{ titulo: "Finiquito", valor: (f) => f.estado, opciones: opcionesDe("finiquito") }]
})

function botones(fila) {
    const id = fila.trabajador.id
    const f = fila.finiquito
    const lista = []
    if (f) {
        lista.push(`<button type="button" class="chico secundario" data-accion="detalle" data-trabajador="${id}">Detalle</button>`)
    }
    if (fila.mesCerrado) {
        // Mes del término cerrado: solo ver y descargar.
        if (f) {
            lista.push(`<button type="button" class="chico secundario" data-accion="pdf" data-trabajador="${id}">PDF</button>`)
        }
        if (f?.estado === "emitido") {
            lista.push(`<button type="button" class="chico" data-accion="pagar" data-trabajador="${id}">Marcar pagado</button>`)
        }
        return lista.join(" ")
    }
    if (!f) {
        lista.push(`<button type="button" class="chico secundario" data-accion="calcular" data-trabajador="${id}">Calcular</button>`)
        lista.push(`<button type="button" class="chico secundario" data-accion="quitar-termino" data-trabajador="${id}">Quitar término</button>`)
    }
    if (f && f.estado !== "pagado") {
        // Recalcular usa los datos guardados; «Editar datos» abre el formulario para cambiarlos.
        lista.push(`<button type="button" class="chico ${f.saldo_desactualizado ? "" : "secundario"}" data-accion="recalcular" data-trabajador="${id}">Recalcular</button>`)
        lista.push(`<button type="button" class="chico secundario" data-accion="calcular" data-trabajador="${id}">Editar datos</button>`)
    }
    if (f?.estado === "calculado") {
        lista.push(`<button type="button" class="chico" data-accion="emitir" data-trabajador="${id}">Cerrar finiquito</button>`)
    }
    if (f?.estado === "emitido") {
        lista.push(`<button type="button" class="chico" data-accion="pagar" data-trabajador="${id}">Marcar pagado</button>`)
    }
    if (f) {
        lista.push(`<button type="button" class="chico secundario" data-accion="pdf" data-trabajador="${id}">PDF</button>`)
    }
    if (f && f.estado !== "pagado") {
        lista.push(`<button type="button" class="chico secundario" data-accion="eliminar" data-trabajador="${id}">Eliminar</button>`)
    }
    return lista.join(" ")
}

async function cargarFiniquitos() {
    document.getElementById("panelCalculo").hidden = true
    document.getElementById("panelDetalle").hidden = true

    const listas = await cargarListas(["/api/trabajadores", "/api/personas", "/api/periodos-remuneracion"])
    if (!listas) {
        return
    }
    const personaPorId = porId(listas[1])
    // Estado del periodo del mes de término: con el mes cerrado, el finiquito solo se ve (para cambiarlo existe la reapertura).
    const estadoPeriodo = new Map(deEmpresaActual(listas[2]).map((p) => [`${p.anio}-${String(p.mes).padStart(2, "0")}`, p.estado]))
    const trabajadores = deEmpresaActual(listas[0])
    const conTermino = trabajadores.filter((t) => t.fecha_termino)

    const finiquitos = await Promise.all(conTermino.map(async (t) => {
        const resultado = await llamarApi(`/api/finiquitos?trabajador_id=${t.id}`)
        return resultado.status === 200 ? resultado.datos : null
    }))

    filas = conTermino.map((trabajador, i) => ({
        trabajador,
        persona: personaPorId.get(trabajador.persona_id),
        finiquito: finiquitos[i],
        mesCerrado: estadoPeriodo.get(String(trabajador.fecha_termino).slice(0, 7)) === "cerrado",
        estado: finiquitos[i]?.estado ?? "sin_calcular"
    })).sort((a, b) => String(b.trabajador.fecha_termino).localeCompare(String(a.trabajador.fecha_termino)))

    tabla.mostrar(filas)

    llenarBuscador(document.getElementById("trabajadorTermino"), trabajadores
        .filter((t) => t.estado !== "postulante" && !t.fecha_termino)
        .map((t) => ({ id: t.id, texto: textoTrabajador(t, personaPorId.get(t.persona_id)) })))
}

// ---------- Registrar término ----------

llenarSelect(document.getElementById("causalTermino"),
    Object.entries(CAUSALES).map(([codigo, texto]) => ({ id: codigo, texto })), "Elige la causal")

document.getElementById("formTermino").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const trabajadorId = valorBuscador(document.getElementById("trabajadorTermino"))
    if (trabajadorId === null) {
        mensaje("error", "Elige un trabajador de la lista de sugerencias")
        return
    }

    const resultado = await llamarApi(`/api/trabajadores/${trabajadorId}`, {
        method: "PATCH",
        body: JSON.stringify({
            fecha_termino: document.getElementById("fechaTermino").value,
            causal_termino: Number(document.getElementById("causalTermino").value),
            estado: "desvinculado"
        })
    })

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo registrar el término")
        return
    }

    mensaje("info", "Término registrado. Ahora puedes calcular el finiquito.")
    cerrarPanelCrear(this)
    cargarFiniquitos()
})

// ---------- Calcular ----------

function agregarFilaDescuento(descuento = {}) {
    const fila = document.createElement("div")
    fila.className = "fila-descuento"
    fila.innerHTML = `
        <input type="text" class="glosa" placeholder="Glosa" required>
        <input type="number" class="monto" placeholder="Monto" min="1" step="1" required>
        <select class="codigo">${CODIGOS_DESCUENTO.map(([codigo, texto]) => `<option value="${codigo}">${escaparHtml(texto)}</option>`).join("")}</select>
        <button type="button" class="chico secundario quitar" aria-label="Quitar descuento">Quitar</button>`
    fila.querySelector(".glosa").value = descuento.glosa ?? ""
    fila.querySelector(".monto").value = descuento.monto ?? ""
    if (descuento.codigo_lre) {
        fila.querySelector(".codigo").value = descuento.codigo_lre
    }
    fila.querySelector(".quitar").addEventListener("click", () => fila.remove())
    document.getElementById("listaDescuentos").appendChild(fila)
}

function abrirCalculo(fila) {
    trabajadorEnCalculo = fila.trabajador
    const f = fila.finiquito
    document.getElementById("panelDetalle").hidden = true

    document.getElementById("tituloCalculo").textContent = `${f ? "Recalcular" : "Calcular"} finiquito de ${nombreCompleto(fila.persona)}`
    document.getElementById("subtituloCalculo").textContent =
        `Término ${fechaCorta(fila.trabajador.fecha_termino)} · ${CAUSALES[fila.trabajador.causal_termino] ?? "sin causal"}`

    document.getElementById("fechaFiniquito").value = f?.fecha_finiquito ?? fila.trabajador.fecha_termino
    document.getElementById("lugar").value = f?.lugar ?? ""
    document.getElementById("avisoPrevio").value = String(f?.aviso_previo_dado ?? false)
    document.getElementById("diasTomados").value = f ? Number(f.dias_tomados) : 0
    document.getElementById("diasInhabiles").value = f?.dias_inhabiles ?? 0
    document.getElementById("imputacionAfc").value = f?.imputacion_afc ?? 0
    document.getElementById("listaDescuentos").innerHTML = ""
    // El saldo de pago en exceso lo agrega el servidor al calcular: no se edita a mano.
    for (const descuento of (f?.descuentos ?? []).filter((d) => !d.automatico)) {
        agregarFilaDescuento(descuento)
    }

    const panel = document.getElementById("panelCalculo")
    panel.hidden = false
    panel.scrollIntoView({ behavior: "smooth", block: "start" })
}

document.getElementById("agregarDescuento").addEventListener("click", () => agregarFilaDescuento())
document.getElementById("cerrarCalculo").addEventListener("click", () => { document.getElementById("panelCalculo").hidden = true })

document.getElementById("formCalculo").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const descuentos = [...document.querySelectorAll(".fila-descuento")].map((fila) => ({
        glosa: fila.querySelector(".glosa").value.trim(),
        monto: Number(fila.querySelector(".monto").value),
        codigo_lre: Number(fila.querySelector(".codigo").value)
    }))

    const resultado = await llamarApi("/api/finiquitos", {
        method: "POST",
        body: JSON.stringify({
            trabajador_id: trabajadorEnCalculo.id,
            fecha_finiquito: document.getElementById("fechaFiniquito").value,
            lugar: document.getElementById("lugar").value.trim(),
            aviso_previo_dado: document.getElementById("avisoPrevio").value === "true",
            dias_tomados: Number(document.getElementById("diasTomados").value),
            dias_inhabiles: Number(document.getElementById("diasInhabiles").value),
            imputacion_afc: Number(document.getElementById("imputacionAfc").value || 0),
            descuentos
        })
    })

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo calcular el finiquito")
        return
    }

    mensaje("info", `Finiquito calculado: ${pesos(resultado.datos.total_a_pagar)}.${textoSaldoFiniquito(resultado.datos)} Revísalo y ciérralo cuando la liquidación del mes esté cerrada.`)
    await cargarFiniquitos()
    const fila = filas.find((f) => f.trabajador.id === resultado.datos.trabajador_id)
    if (fila) {
        mostrarDetalle(fila)
    }
})

// ---------- Detalle ----------

function filaMonto(texto, valor, clase = "") {
    return `<tr class="${clase}"><td>${escaparHtml(texto)}</td><td class="numero">${escaparHtml(pesos(valor))}</td></tr>`
}

function mostrarDetalle(fila) {
    const f = fila.finiquito
    const d = f.detalle_calculo ?? {}
    const feriado = d.feriado ?? {}
    const panel = document.getElementById("panelDetalle")

    panel.innerHTML = `
        <div class="encabezado-pagina">
            <div>
                <h2>Finiquito de ${escaparHtml(nombreCompleto(fila.persona))}</h2>
                <p>${escaparHtml(textoEstado("finiquito", f.estado))} · firma ${escaparHtml(fechaCorta(f.fecha_finiquito))} en ${escaparHtml(f.lugar)}${f.fecha_pago ? ` · pagado el ${escaparHtml(fechaCorta(f.fecha_pago))}` : ""}</p>
            </div>
            <button type="button" class="secundario chico" id="cerrarDetalle">Cerrar detalle</button>
        </div>
        <div class="rejilla">
            <table>
                <thead><tr><th>Haberes</th><th class="numero">Monto</th></tr></thead>
                <tbody>
                    ${filaMonto(`Feriado proporcional (${feriado.diasPorPagar ?? "—"} días)`, f.monto_feriado)}
                    ${filaMonto("Indemnización sustitutiva del aviso previo", f.monto_aviso_previo)}
                    ${filaMonto(`Indemnización por años de servicio (${d.anios ?? 0} años)`, f.monto_anios_servicio)}
                </tbody>
            </table>
            <table>
                <thead><tr><th>Descuentos</th><th class="numero">Monto</th></tr></thead>
                <tbody>
                    ${filaMonto("Imputación seguro de cesantía", f.imputacion_afc)}
                    ${(f.descuentos ?? []).map((x) => filaMonto(`${x.glosa} (${x.codigo_lre})`, x.monto)).join("")}
                    ${filaMonto("Total descuentos", f.total_descuentos, "total")}
                </tbody>
            </table>
        </div>
        <p class="liquido">Total a pagar: <strong>${escaparHtml(pesos(f.total_a_pagar))}</strong></p>
        <details>
            <summary>Bases del cálculo</summary>
            <table>
                <tbody>
                    <tr><td>Periodo trabajado</td><td>${escaparHtml(fechaCorta(d.fechaIngreso))} al ${escaparHtml(fechaCorta(d.fechaTermino))}</td></tr>
                    <tr><td>Sueldo mensual del mes de término</td><td class="numero">${escaparHtml(pesos(d.sueldoMensual))}</td></tr>
                    <tr><td>Meses promediados</td><td>${escaparHtml((d.mesesPromedio ?? []).join(", ") || "—")}</td></tr>
                    <tr><td>Base indemnizaciones</td><td class="numero">${escaparHtml(pesos(d.bases?.baseIndemnizacion))}</td></tr>
                    <tr><td>Base feriado</td><td class="numero">${escaparHtml(pesos(d.bases?.baseFeriado))}</td></tr>
                    <tr><td>Base con tope de ${escaparHtml(d.topeUF ?? 90)} UF (UF ${escaparHtml(pesos(d.valorUF))})</td><td class="numero">${escaparHtml(pesos(d.baseTopada))}</td></tr>
                    <tr><td>Feriado: ganados − tomados + inhábiles</td><td>${escaparHtml(`${feriado.diasGanados ?? "—"} − ${feriado.diasTomados ?? "—"} + ${feriado.diasInhabiles ?? "—"} = ${feriado.diasPorPagar ?? "—"} días`)}</td></tr>
                </tbody>
            </table>
        </details>`
    panel.hidden = false
    panel.querySelector("#cerrarDetalle").addEventListener("click", () => { panel.hidden = true })
    panel.scrollIntoView({ behavior: "smooth", block: "start" })
}

// ---------- Acciones de la tabla ----------

document.getElementById("tablaFiniquitos").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-accion]")
    if (!boton) {
        return
    }
    const fila = filas.find((f) => String(f.trabajador.id) === boton.dataset.trabajador)
    const nombre = nombreCompleto(fila.persona)
    limpiarMensajes()

    if (boton.dataset.accion === "calcular") {
        abrirCalculo(fila)
        return
    }
    if (boton.dataset.accion === "detalle") {
        mostrarDetalle(fila)
        return
    }
    if (boton.dataset.accion === "pdf") {
        const resultado = await descargarArchivo(`/api/finiquitos/${fila.finiquito.id}/documento`)
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo descargar")
        }
        return
    }

    if (boton.dataset.accion === "recalcular") {
        const r = await llamarApi(`/api/finiquitos/${fila.finiquito.id}/recalcular`, { method: "POST" })
        if (r.status !== 200) {
            mensaje("error", r.datos?.error ?? "No se pudo recalcular el finiquito")
            return
        }
        await cargarFiniquitos()
        mensaje("info", `Finiquito de ${nombre} recalculado: ${pesos(r.datos.total_a_pagar)}.${textoSaldoFiniquito(r.datos)}${fila.finiquito.estado === "emitido" ? " Quedó otra vez por cerrar." : ""}`)
        return
    }
    if (boton.dataset.accion === "eliminar") {
        await eliminarFiniquito(fila, nombre)
        return
    }
    if (boton.dataset.accion === "quitar-termino") {
        if (!confirm(`¿Quitar el término de ${nombre}? Se borran la fecha y la causal de término y el trabajador vuelve a quedar activo.`)) {
            return
        }
        const r = await llamarApi("/api/finiquitos/quitar-termino", { method: "POST", body: JSON.stringify({ trabajador_id: fila.trabajador.id }) })
        if (r.status !== 200) {
            mensaje("error", r.datos?.error ?? "No se pudo quitar el término")
            return
        }
        await cargarFiniquitos()
        mensaje("info", ["Término quitado.", ...(r.datos.advertencias ?? [])].join(" "))
        return
    }

    let resultado
    if (boton.dataset.accion === "emitir") {
        if (!confirm(`¿Cerrar el finiquito de ${nombre}? Mientras no esté pagado y el periodo siga abierto, se puede recalcular.`)) {
            return
        }
        resultado = await llamarApi(`/api/finiquitos/${fila.finiquito.id}/emitir`, { method: "PATCH" })
    }
    if (boton.dataset.accion === "pagar") {
        const fecha = prompt(`Fecha de pago del finiquito de ${nombre} (AAAA-MM-DD):`, hoyIso())
        if (fecha === null) {
            return
        }
        resultado = await llamarApi(`/api/finiquitos/${fila.finiquito.id}/pagar`, { method: "PATCH", body: JSON.stringify({ fecha_pago: fecha.trim() }) })
    }

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo completar la acción")
        return
    }
    mensaje("info", boton.dataset.accion === "emitir" ? "Finiquito cerrado." : "Finiquito marcado como pagado.")
    cargarFiniquitos()
})

// Elimina el finiquito (no pagado, con el mes del término abierto). El emitido pide motivo. Ofrece quitar también el término.
async function eliminarFiniquito(fila, nombre) {
    const emitido = fila.finiquito.estado === "emitido"
    let motivo = ""
    if (emitido) {
        const respuesta = prompt(`El finiquito de ${nombre} ya fue cerrado (emitido). Para eliminarlo, escribe el motivo; queda registrado:`)
        if (respuesta === null) {
            return
        }
        motivo = respuesta.trim()
        if (motivo === "") {
            mensaje("error", "Para eliminar un finiquito cerrado hay que indicar el motivo")
            return
        }
    } else if (!confirm(`¿Eliminar el finiquito de ${nombre}? Queda registrado y se puede volver a calcular.`)) {
        return
    }
    const quitarTermino = confirm(`¿Quitar también el término de ${nombre} (fecha y causal)?\n\nAceptar: el trabajador vuelve a quedar activo.\nCancelar: se mantiene el término y se puede calcular el finiquito de nuevo.`)

    const r = await llamarApi(`/api/finiquitos/${fila.finiquito.id}/eliminar`, { method: "POST", body: JSON.stringify({ motivo, quitar_termino: quitarTermino }) })
    if (r.status !== 200) {
        mensaje("error", r.datos?.error ?? "No se pudo eliminar el finiquito")
        return
    }
    await cargarFiniquitos()
    mensaje("info", [r.datos.termino_quitado ? "Finiquito eliminado y término quitado." : "Finiquito eliminado.", ...(r.datos.advertencias ?? [])].join(" "))
}

// Texto del saldo de pago en exceso que descontó un finiquito.
function textoSaldoFiniquito(finiquito) {
    const saldo = finiquito.detalle_calculo?.saldoPagoExceso
    if (!(saldo?.descontado > 0)) {
        return ""
    }
    return ` Se descontó el saldo de pago en exceso: ${pesos(saldo.descontado)}.` + (saldo.noRecuperado > 0 ? ` No alcanzó para ${pesos(saldo.noRecuperado)}: esa diferencia se gestiona fuera del sistema.` : "")
}

document.addEventListener("empresa-lista", () => { limpiarMensajes(); cargarFiniquitos() })
