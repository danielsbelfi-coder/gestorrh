requiereLogin()

// Turnos de conducción del art. 25 (paquete V): tipos de espera de la empresa, turnos del mes y su resumen.
const campoMes = document.getElementById("mes")
const selectorTrabajador = document.getElementById("trabajador")
let tipos = []
let tipoEnEdicion = null
let turnoEnEdicion = null
let datosMes = null

const CLASES = { terminal: "Terminal", cruce: "Cruce", aduana: "Aduana", mantencion: "Mantención", retraso_operativo: "Retraso operativo", descanso_bordo: "Descanso a bordo", descanso_tierra: "Descanso en tierra", otro: "Otro" }

function horas(minutos) {
    const m = Math.round(Number(minutos) || 0)
    const h = Math.floor(m / 60)
    const resto = m % 60
    return resto ? `${h} h ${resto} min` : `${h} h`
}

function horaDe(minutosDelDia) {
    const m = ((minutosDelDia % 1440) + 1440) % 1440
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`
}

function mesActual() {
    const hoy = hoyIso()
    return hoy.slice(0, 7)
}

function anioMes() {
    const [anio, mes] = campoMes.value.split("-").map(Number)
    return { anio, mes }
}

// ---------- Tipos de espera ----------

function textoPago(t) {
    if (t.imputable) {
        return "Es jornada"
    }
    if (t.compensacion === "descanso") {
        return `Compensa en descanso${t.minutos_sin_pago ? ` desde el minuto ${t.minutos_sin_pago + 1}` : ""}`
    }
    if (t.pago === "por_hora") {
        return `${pesos(t.valor)} por hora${t.minutos_sin_pago ? ` desde el minuto ${t.minutos_sin_pago + 1}` : ""}${t.redondeo_minutos > 1 ? ` · fracción de ${t.redondeo_minutos} min` : ""}`
    }
    if (t.pago === "monto_fijo") {
        return `${pesos(t.valor)} por espera${t.minutos_sin_pago ? ` de más de ${t.minutos_sin_pago} min` : ""}`
    }
    return "No se paga (se registra)"
}

function dibujarTipos() {
    document.getElementById("tablaTipos").innerHTML = `<div class="tabla-marco"><table>
        <thead><tr><th>Nombre</th><th>Clase</th><th>¿Jornada?</th><th>Pago o compensación</th><th>Estado</th><th></th></tr></thead>
        <tbody>${tipos.map((t) => `<tr>
            <td>${escaparHtml(t.nombre)}</td><td>${escaparHtml(CLASES[t.clase] ?? t.clase)}</td>
            <td>${t.imputable ? "Sí" : "No"}</td><td>${escaparHtml(textoPago(t))}</td>
            <td>${t.activo ? "Activo" : "Inactivo"}</td>
            <td><button type="button" class="chico secundario" data-editar-tipo="${t.id}">Editar</button>
                <button type="button" class="chico secundario" data-activo-tipo="${t.id}">${t.activo ? "Desactivar" : "Reactivar"}</button></td>
        </tr>`).join("")}</tbody></table></div>`
}

function aplicarImputable() {
    const imputable = document.getElementById("tipoImputable").value === "true"
    document.querySelectorAll("[data-no-imputable]").forEach((el) => { el.hidden = imputable })
}
document.getElementById("tipoImputable").addEventListener("change", aplicarImputable)

function salirDeTipo() {
    tipoEnEdicion = null
    document.getElementById("formTipo").reset()
    document.getElementById("guardarTipo").textContent = "Agregar tipo"
    document.getElementById("cancelarTipo").hidden = true
    aplicarImputable()
}
document.getElementById("cancelarTipo").addEventListener("click", salirDeTipo)

async function cargarTipos() {
    const r = await llamarApi(`/api/tipos-espera?empresa_id=${empresaActual()}`)
    if (r.status !== 200) {
        mensaje("error", r.datos?.error ?? "No se pudieron cargar los tipos de espera")
        return
    }
    tipos = r.datos
    dibujarTipos()
    dibujarPausas(leerPausas())
}

document.getElementById("formTipo").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const cuerpo = {
        nombre: document.getElementById("tipoNombre").value.trim(),
        clase: document.getElementById("tipoClase").value,
        imputable: document.getElementById("tipoImputable").value === "true",
        pago: document.getElementById("tipoPago").value,
        valor: Number(document.getElementById("tipoValor").value || 0),
        minutos_sin_pago: Number(document.getElementById("tipoSinPago").value || 0),
        redondeo_minutos: Number(document.getElementById("tipoRedondeo").value),
        compensacion: document.getElementById("tipoCompensacion").value
    }
    const r = tipoEnEdicion
        ? await llamarApi(`/api/tipos-espera/${tipoEnEdicion.id}`, { method: "PATCH", body: JSON.stringify(cuerpo) })
        : await llamarApi("/api/tipos-espera", { method: "POST", body: JSON.stringify({ ...cuerpo, empresa_id: empresaActual() }) })
    if (r.status !== 200 && r.status !== 201) {
        mensaje("error", r.datos?.error ?? "No se pudo guardar el tipo de espera")
        return
    }
    mensaje("info", tipoEnEdicion ? "Tipo de espera actualizado." : "Tipo de espera agregado.")
    salirDeTipo()
    await cargarTipos()
    cargarMes()
})

document.getElementById("tablaTipos").addEventListener("click", async function (evento) {
    const editar = evento.target.closest("[data-editar-tipo]")?.dataset.editarTipo
    if (editar) {
        tipoEnEdicion = tipos.find((t) => String(t.id) === editar)
        document.getElementById("tipoNombre").value = tipoEnEdicion.nombre
        document.getElementById("tipoClase").value = tipoEnEdicion.clase
        document.getElementById("tipoImputable").value = String(tipoEnEdicion.imputable)
        document.getElementById("tipoPago").value = tipoEnEdicion.pago
        document.getElementById("tipoValor").value = tipoEnEdicion.valor
        document.getElementById("tipoSinPago").value = tipoEnEdicion.minutos_sin_pago
        document.getElementById("tipoRedondeo").value = String(tipoEnEdicion.redondeo_minutos)
        document.getElementById("tipoCompensacion").value = tipoEnEdicion.compensacion
        document.getElementById("guardarTipo").textContent = "Guardar cambios"
        document.getElementById("cancelarTipo").hidden = false
        aplicarImputable()
        return
    }
    const activo = evento.target.closest("[data-activo-tipo]")?.dataset.activoTipo
    if (activo) {
        const tipo = tipos.find((t) => String(t.id) === activo)
        const r = await llamarApi(`/api/tipos-espera/${tipo.id}`, { method: "PATCH", body: JSON.stringify({ activo: !tipo.activo }) })
        if (r.status !== 200) {
            mensaje("error", r.datos?.error ?? "No se pudo cambiar el estado")
            return
        }
        cargarTipos()
    }
})

// ---------- Trabajadores y mes ----------

async function cargarTrabajadores() {
    const { anio, mes } = anioMes()
    const r = await llamarApi(`/api/turnos-conduccion/trabajadores?empresa_id=${empresaActual()}&anio=${anio}&mes=${mes}`)
    const lista = r.status === 200 ? r.datos : []
    const elegido = selectorTrabajador.value
    selectorTrabajador.innerHTML = lista.length
        ? lista.map((t) => `<option value="${t.id}">${escaparHtml(`${t.nombre} · ${t.rut}`)}</option>`).join("")
        : `<option value="">Nadie tiene jornada del art. 25 este mes</option>`
    if (lista.some((t) => String(t.id) === elegido)) {
        selectorTrabajador.value = elegido
    }
    cargarMes()
}

async function cargarMes() {
    const id = selectorTrabajador.value
    const visible = Boolean(id)
    for (const elemento of ["resumenTurnos", "panelTurno", "contenedorTurnos", "aprobarMes"]) {
        document.getElementById(elemento).hidden = !visible
    }
    if (!visible) {
        return
    }
    const { anio, mes } = anioMes()
    const r = await llamarApi(`/api/turnos-conduccion?trabajador_id=${id}&anio=${anio}&mes=${mes}`)
    if (r.status !== 200) {
        mensaje("error", r.datos?.error ?? "No se pudieron cargar los turnos")
        return
    }
    datosMes = r.datos
    dibujarMes()
}

function dibujarMes() {
    const { resumen, jornada, topeHoras, turnos } = datosMes
    const sobre = resumen.minutosSobreTope
    const tarjetas = [
        ["Jornada aprobada", horas(resumen.minutosJornada), ""],
        ["Tope del mes", `${String(topeHoras).replace(".", ",")} h`, ""],
        ["Sobre el tope", horas(sobre), sobre > 0 ? "advertencia" : ""],
        ["Pago de esperas", pesos(resumen.montoEsperas), ""],
        ["Tiempo compensatorio", horas(resumen.minutosCompensatorios), ""],
        ["Turnos", `${resumen.aprobados} aprobados · ${resumen.pendientes} pendientes`, resumen.pendientes ? "advertencia" : ""],
        ["Alertas del art. 25", String(resumen.alertas), resumen.alertas ? "peligro" : ""]
    ]
    document.getElementById("totales").innerHTML = tarjetas.map(([titulo, valor, clase]) => `
        <div class="libro-total ${clase}"><span>${escaparHtml(titulo)}</span><strong>${escaparHtml(valor)}</strong></div>`).join("")
    document.getElementById("infoJornada").textContent = jornada
        ? `Jornada: ${jornada.nombre} (${Number(jornada.horas_mensuales)} horas mensuales). Si el contrato entra o termina en el mes, el tope es proporcional a los días pagados sobre 30, como el sueldo. Para la liquidación: en Resumen de asistencia, «Generar desde la asistencia» propone las horas sobre el tope como horas extra al 50 % y el pago de esperas como «Tiempo de espera»; apruébalos y calcula.`
        : "El trabajador no tiene jornada del art. 25 en este mes."
    document.getElementById("tablaEsperas").innerHTML = resumen.esperas.length
        ? `<div class="tabla-marco"><table><thead><tr><th>Espera o descanso</th><th>¿Jornada?</th><th class="numero">Veces</th><th class="numero">Tiempo</th><th class="numero">Pagable</th><th class="numero">Monto</th><th class="numero">Compensatorio</th></tr></thead><tbody>
            ${resumen.esperas.map((e) => `<tr><td>${escaparHtml(e.tipo)}</td><td>${e.imputable ? "Sí" : "No"}</td><td class="numero">${e.cantidad}</td><td class="numero">${horas(e.minutos)}</td><td class="numero">${horas(e.pagables)}</td><td class="numero">${pesos(e.monto)}</td><td class="numero">${horas(e.compensatorios)}</td></tr>`).join("")}
            </tbody></table></div>`
        : ""

    document.getElementById("filasTurnos").innerHTML = turnos.length
        ? turnos.map((t) => {
            const c = t.calculo
            const pausas = c.pausas.filter((p) => !p.imputable)
            const avisos = [...c.errores.map((e) => `<li class="error">${escaparHtml(e)}</li>`), ...c.alertas.map((a) => `<li class="aviso">${escaparHtml(a)}</li>`)].join("")
            return `<tr>
                <td>${escaparHtml(fechaCorta(t.fecha))}</td>
                <td>${escaparHtml(t.servicio ?? "")}</td>
                <td>${escaparHtml(`${t.hora_inicio} – ${t.hora_fin}${c.fin !== null && c.fin >= 1440 ? " (día sig.)" : ""}`)}</td>
                <td class="numero">${escaparHtml(horas(c.minutosJornada))}</td>
                <td>${c.pausas.map((p) => escaparHtml(`${p.tipo} ${horaDe(p.inicio)}–${horaDe(p.fin)}${p.imputable ? " (jornada)" : ""}`)).join("<br>") || "—"}${pausas.length ? `<br><span class="texto-suave">${escaparHtml(horas(c.minutosNoImputables))} fuera de la jornada</span>` : ""}</td>
                <td class="numero">${c.monto ? escaparHtml(pesos(c.monto)) : "—"}</td>
                <td>${t.estado_aprobacion === "aprobado" ? "Aprobado" : "Pendiente"}</td>
                <td>${avisos ? `<ul class="problemas-jornada">${avisos}</ul>` : ""}</td>
                <td><button type="button" class="chico secundario" data-editar="${t.id}">Editar</button>
                    ${t.estado_aprobacion !== "aprobado" ? `<button type="button" class="chico" data-aprobar="${t.id}">Aprobar</button>` : ""}
                    <button type="button" class="chico secundario" data-eliminar="${t.id}">Eliminar</button></td>
            </tr>`
        }).join("")
        : `<tr><td colspan="9" class="texto-suave">Sin turnos registrados en el mes.</td></tr>`
}

// ---------- Formulario de turno ----------

function opcionesTipo(seleccionado) {
    return tipos.filter((t) => t.activo || String(t.id) === String(seleccionado))
        .map((t) => `<option value="${t.id}"${String(t.id) === String(seleccionado) ? " selected" : ""}>${escaparHtml(t.nombre)}${t.imputable ? " (jornada)" : ""}</option>`).join("")
}

function dibujarPausas(pausas) {
    document.getElementById("filasPausas").innerHTML = pausas.map((p) => `<tr>
        <td><select class="pausa-tipo">${opcionesTipo(p.tipo_espera_id)}</select></td>
        <td><input type="time" class="pausa-inicio" value="${escaparHtml(p.inicio ?? "")}"></td>
        <td><input type="time" class="pausa-fin" value="${escaparHtml(p.fin ?? "")}"></td>
        <td><input type="text" class="pausa-lugar" maxlength="120" value="${escaparHtml(p.lugar ?? "")}"></td>
        <td><input type="text" class="pausa-causa" maxlength="200" value="${escaparHtml(p.causa ?? "")}"></td>
        <td><button type="button" class="chico secundario" data-quitar>Quitar</button></td>
    </tr>`).join("")
}

function leerPausas() {
    return [...document.querySelectorAll("#filasPausas tr")].map((fila) => ({
        tipo_espera_id: Number(fila.querySelector(".pausa-tipo").value),
        inicio: fila.querySelector(".pausa-inicio").value,
        fin: fila.querySelector(".pausa-fin").value,
        lugar: fila.querySelector(".pausa-lugar").value,
        causa: fila.querySelector(".pausa-causa").value
    }))
}

document.getElementById("agregarPausa").addEventListener("click", () => dibujarPausas([...leerPausas(), { tipo_espera_id: tipos.find((t) => t.activo)?.id }]))
document.getElementById("filasPausas").addEventListener("click", function (evento) {
    if (evento.target.closest("[data-quitar]")) {
        evento.target.closest("tr").remove()
    }
})

// «Repetir hasta»: el mismo turno en cada día marcado del rango (solo al registrar, no al editar).
function diasMarcados() {
    return [...document.querySelectorAll("#diasRepetir input:checked")].map((c) => Number(c.value))
}

function fechasDelRango() {
    const desde = document.getElementById("turnoFecha").value
    const hasta = document.getElementById("turnoHasta").value
    if (!desde || !hasta || hasta < desde) {
        return []
    }
    const marcados = diasMarcados()
    const fechas = []
    for (let d = new Date(`${desde}T00:00:00Z`); d.toISOString().slice(0, 10) <= hasta && fechas.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
        if (marcados.includes(((d.getUTCDay() + 6) % 7) + 1)) {
            fechas.push(d.toISOString().slice(0, 10))
        }
    }
    return fechas
}

function actualizarRepetir() {
    const conRango = !turnoEnEdicion && Boolean(document.getElementById("turnoHasta").value)
    document.getElementById("diasRepetir").hidden = !conRango
    const fechas = fechasDelRango()
    document.getElementById("resumenRepetir").textContent = conRango ? `${fechas.length} turno(s) a registrar` : ""
    document.getElementById("guardarTurno").textContent = turnoEnEdicion ? "Guardar cambios" : conRango ? "Registrar turnos" : "Registrar turno"
}
document.getElementById("turnoFecha").addEventListener("change", actualizarRepetir)
document.getElementById("turnoHasta").addEventListener("change", actualizarRepetir)
document.getElementById("diasRepetir").addEventListener("change", actualizarRepetir)

function salirDeTurno() {
    turnoEnEdicion = null
    document.getElementById("formTurno").reset()
    dibujarPausas([])
    document.getElementById("problemasTurno").innerHTML = ""
    document.getElementById("tituloTurno").textContent = "＋ Registrar turno"
    document.getElementById("guardarTurno").textContent = "Registrar turno"
    document.getElementById("cancelarTurno").hidden = true
    document.querySelectorAll("[data-solo-alta]").forEach((el) => { el.hidden = false })
    document.querySelectorAll("#diasRepetir input").forEach((c) => { c.checked = true })
    actualizarRepetir()
}
document.getElementById("cancelarTurno").addEventListener("click", () => { salirDeTurno(); document.getElementById("panelTurno").removeAttribute("open") })

document.getElementById("formTurno").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const cuerpo = {
        trabajador_id: Number(selectorTrabajador.value),
        fecha: document.getElementById("turnoFecha").value,
        hora_inicio: document.getElementById("turnoInicio").value,
        hora_fin: document.getElementById("turnoFin").value,
        servicio: document.getElementById("turnoServicio").value,
        observaciones: document.getElementById("turnoObs").value,
        pausas: leerPausas()
    }
    const hasta = document.getElementById("turnoHasta").value
    if (!turnoEnEdicion && hasta) {
        const fechas = fechasDelRango()
        if (fechas.length === 0) {
            document.getElementById("problemasTurno").innerHTML = `<li class="error">El rango no tiene días marcados (revisa las fechas y los días de la semana)</li>`
            return
        }
        const { fecha, ...resto } = cuerpo
        const r = await llamarApi("/api/turnos-conduccion/lote", { method: "POST", body: JSON.stringify({ ...resto, desde: fecha, hasta, dias_semana: diasMarcados() }) })
        if (r.status !== 201) {
            document.getElementById("problemasTurno").innerHTML = `<li class="error">${escaparHtml(r.datos?.error ?? "No se pudieron registrar los turnos")}</li>`
            return
        }
        const { creados, omitidos } = r.datos
        const alertas = creados.filter((c) => c.alertas.length > 0).length
        mensaje(omitidos.length ? "error" : "info", [
            `${creados.length} turno(s) registrado(s) (pendientes de aprobación)${alertas ? `, ${alertas} con alertas del art. 25` : ""}.`,
            ...omitidos.map((o) => `${fechaCorta(o.fecha)}: no se registró — ${o.motivo}.`)
        ].join(" "))
        salirDeTurno()
        cargarMes()
        return
    }
    const r = turnoEnEdicion
        ? await llamarApi(`/api/turnos-conduccion/${turnoEnEdicion.id}`, { method: "PATCH", body: JSON.stringify(cuerpo) })
        : await llamarApi("/api/turnos-conduccion", { method: "POST", body: JSON.stringify(cuerpo) })
    if (r.status !== 200 && r.status !== 201) {
        document.getElementById("problemasTurno").innerHTML = `<li class="error">${escaparHtml(r.datos?.error ?? "No se pudo guardar el turno")}</li>`
        return
    }
    const alertas = r.datos.alertas ?? []
    mensaje("info", [turnoEnEdicion ? "Turno actualizado (queda pendiente de aprobación)." : "Turno registrado (pendiente de aprobación).", ...alertas].join(" "))
    salirDeTurno()
    cargarMes()
})

document.getElementById("filasTurnos").addEventListener("click", async function (evento) {
    const editar = evento.target.closest("[data-editar]")?.dataset.editar
    if (editar) {
        turnoEnEdicion = datosMes.turnos.find((t) => String(t.id) === editar)
        document.getElementById("turnoFecha").value = turnoEnEdicion.fecha
        document.getElementById("turnoInicio").value = turnoEnEdicion.hora_inicio
        document.getElementById("turnoFin").value = turnoEnEdicion.hora_fin
        document.getElementById("turnoServicio").value = turnoEnEdicion.servicio ?? ""
        document.getElementById("turnoObs").value = turnoEnEdicion.observaciones ?? ""
        dibujarPausas(turnoEnEdicion.pausas ?? [])
        document.getElementById("tituloTurno").textContent = `Editar turno del ${fechaCorta(turnoEnEdicion.fecha)}`
        document.getElementById("guardarTurno").textContent = "Guardar cambios"
        document.getElementById("cancelarTurno").hidden = false
        document.getElementById("turnoHasta").value = ""
        document.querySelectorAll("[data-solo-alta]").forEach((el) => { el.hidden = true })
        actualizarRepetir()
        document.getElementById("panelTurno").open = true
        document.getElementById("panelTurno").scrollIntoView({ behavior: "smooth", block: "start" })
        return
    }
    const aprobar = evento.target.closest("[data-aprobar]")?.dataset.aprobar
    const eliminar = evento.target.closest("[data-eliminar]")?.dataset.eliminar
    if (!aprobar && !eliminar) {
        return
    }
    limpiarMensajes()
    if (eliminar && !confirm("¿Eliminar este turno?")) {
        return
    }
    const r = aprobar
        ? await llamarApi(`/api/turnos-conduccion/${aprobar}/aprobar`, { method: "PATCH" })
        : await llamarApi(`/api/turnos-conduccion/${eliminar}`, { method: "DELETE" })
    if (r.status !== 200 && r.status !== 204) {
        mensaje("error", r.datos?.error ?? "No se pudo completar la acción")
        return
    }
    cargarMes()
})

document.getElementById("aprobarMes").addEventListener("click", async function () {
    limpiarMensajes()
    const { anio, mes } = anioMes()
    const r = await llamarApi("/api/turnos-conduccion/aprobar-mes", { method: "POST", body: JSON.stringify({ trabajador_id: Number(selectorTrabajador.value), anio, mes }) })
    if (r.status !== 200) {
        mensaje("error", r.datos?.error ?? "No se pudieron aprobar los turnos")
        return
    }
    mensaje("info", `${r.datos.aprobados} turno(s) aprobado(s). Los que tienen errores quedan pendientes.`)
    cargarMes()
})

// ---------- Mes ----------

function moverMes(delta) {
    const { anio, mes } = anioMes()
    const fecha = new Date(Date.UTC(anio, mes - 1 + delta, 1))
    campoMes.value = fecha.toISOString().slice(0, 7)
    cargarTrabajadores()
}
document.getElementById("mesAnterior").addEventListener("click", () => moverMes(-1))
document.getElementById("mesSiguiente").addEventListener("click", () => moverMes(1))
campoMes.addEventListener("change", cargarTrabajadores)
selectorTrabajador.addEventListener("change", () => { salirDeTurno(); cargarMes() })

campoMes.value = mesActual()
aplicarImputable()
document.addEventListener("empresa-lista", () => { limpiarMensajes(); salirDeTipo(); salirDeTurno(); cargarTipos(); cargarTrabajadores() })
