requiereLogin()

const TIPOS_MARCA = {
    normal: "Hora real",
    inasistencia: "Inasistencia",
    permiso_con_goce: "Permiso con goce",
    permiso_sin_goce: "Permiso sin goce",
    vacaciones: "Vacaciones"
}
const DIAS_CORTOS = ["", "lun", "mar", "mié", "jue", "vie", "sáb", "dom"]

const campoTrabajador = document.getElementById("trabajador")
const campoMes = document.getElementById("mes")
let trabajadoresPorId = new Map()
let libro = null
let filaEnEdicion = null

// ---------- Formatos ----------

function hora(texto) {
    if (!texto) {
        return ""
    }
    const [h, m] = String(texto).split(":")
    return `${Number(h)}:${m}`
}

function minutosATexto(minutos) {
    if (!minutos) {
        return ""
    }
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return h > 0 ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`
}

function textoEsperado(esperado) {
    switch (esperado.tipo) {
        case "laboral": return `${hora(esperado.entrada)} – ${hora(esperado.salida)}`
        case "libre": return "Libre"
        case "feriado": return `Feriado · ${esperado.nombre}`
        case "licencia": return "Licencia médica"
        case "fuera_contrato": return "Fuera de contrato"
        default: return "Sin horario"
    }
}

function textoMarca(marca) {
    if (!marca) {
        return ""
    }
    if (marca.tipo === "normal" || marca.tipo === "atraso") {
        const entrada = marca.hora_entrada ? `entra ${hora(marca.hora_entrada)}` : ""
        const salida = marca.hora_salida ? `sale ${hora(marca.hora_salida)}` : ""
        return [entrada, salida].filter(Boolean).join(" · ")
    }
    return TIPOS_MARCA[marca.tipo] ?? marca.tipo
}

// ---------- Carga ----------

function anioMes() {
    const [anio, mes] = campoMes.value.split("-").map(Number)
    return { anio, mes }
}

function recordarSeleccion(trabajadorId) {
    const params = new URLSearchParams({ mes: campoMes.value })
    if (trabajadorId) {
        params.set("trabajador", trabajadorId)
    }
    history.replaceState(null, "", `libro.html?${params}`)
    try { localStorage.setItem("libro-mes", campoMes.value) } catch { /* sin almacenamiento: no pasa nada */ }
}

async function cargarTrabajadores() {
    const datos = await trabajadoresDeLaEmpresa()
    if (!datos) {
        return
    }
    const elegibles = datos.trabajadores.filter((t) => t.estado !== "postulante")
    trabajadoresPorId = new Map(elegibles.map((t) => [t.id, t]))
    llenarBuscador(campoTrabajador, elegibles.map((t) => ({ id: t.id, texto: t.textoBuscador })))

    const pedido = Number(new URLSearchParams(location.search).get("trabajador"))
    const elegido = trabajadoresPorId.get(pedido)
    campoTrabajador.value = elegido ? elegido.textoBuscador : ""
    await cargarLibro()
}

async function cargarLibro() {
    filaEnEdicion = null
    const trabajadorId = valorBuscador(campoTrabajador)
    recordarSeleccion(trabajadorId)

    const hay = trabajadorId !== null
    document.getElementById("sinTrabajador").hidden = hay
    document.getElementById("resumenLibro").hidden = !hay
    document.getElementById("contenedorLibro").hidden = !hay
    document.getElementById("aprobarMes").hidden = true
    if (!hay) {
        return
    }

    const { anio, mes } = anioMes()
    const resultado = await llamarApi(`/api/asistencias/libro?trabajador_id=${trabajadorId}&anio=${anio}&mes=${mes}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar el libro")
        return
    }
    libro = resultado.datos
    dibujarResumen()
    dibujarFilas()
}

// ---------- Dibujo ----------

function dibujarResumen() {
    const t = libro.totales
    const tarjetas = [
        ["Atrasos y salidas a descontar", minutosATexto(t.minutos_atraso) || "0 min", t.minutos_atraso > 0 ? "advertencia" : ""],
        ["Horas extra", minutosATexto(t.minutos_extra) || "0", t.minutos_extra > 0 ? "exito" : ""],
        ["Inasistencias", t.dias_inasistencia, t.dias_inasistencia > 0 ? "peligro" : ""],
        ["Permisos sin goce", t.dias_permiso_sin_goce, ""],
        ["Vacaciones", t.dias_vacaciones, ""],
        ["Anotaciones pendientes", t.marcas_pendientes, t.marcas_pendientes > 0 ? "advertencia" : ""]
    ]
    document.getElementById("totales").innerHTML = tarjetas.map(([titulo, valor, clase]) => `
        <div class="libro-total ${clase}"><span>${escaparHtml(titulo)}</span><strong>${escaparHtml(valor)}</strong></div>`).join("")

    const tramos = libro.tramos.filter((tramo) => tramo.nombre)
    const comuna = libro.contrato?.comuna_prestacion
    document.getElementById("infoJornada").textContent = libro.contrato
        ? `Contrato #${libro.contrato.id} · Jornada: ${tramos.length ? tramos.map((tramo) => tramo.desde > "0000-01-01" ? `${tramo.nombre} desde ${fechaCorta(tramo.desde)}` : tramo.nombre).join(", ") : "sin plantilla"}${comuna ? ` · Comuna de prestación: ${COMUNAS[comuna] ?? comuna}` : ""}. Solo lo aprobado suma a los totales.`
        : ""
    document.getElementById("avisosLibro").innerHTML = libro.advertencias.map((a) => `<li class="aviso">${escaparHtml(a)}</li>`).join("")

    const boton = document.getElementById("aprobarMes")
    boton.hidden = t.marcas_pendientes === 0
    boton.textContent = `Aprobar todo el mes (${t.marcas_pendientes})`
}

function accionesDeFila(dia) {
    const editable = !["fuera_contrato", "licencia"].includes(dia.esperado.tipo)
    const m = dia.marca
    if (!m) {
        return editable ? `<button type="button" class="chico secundario" data-anotar="${dia.fecha}">Anotar</button>` : ""
    }
    if (m.estado_aprobacion === "aprobada") {
        return `<button type="button" class="chico secundario" data-estado="pendiente" data-id="${m.id}">Volver a pendiente</button>`
    }
    return `<button type="button" class="chico" data-estado="aprobada" data-id="${m.id}">Aprobar</button>
        ${m.estado_aprobacion === "pendiente" ? `<button type="button" class="chico secundario" data-estado="rechazada" data-id="${m.id}">Rechazar</button>` : ""}
        <button type="button" class="chico secundario" data-anotar="${dia.fecha}">Editar</button>`
}

function dibujarFilas() {
    document.getElementById("filasLibro").innerHTML = libro.dias.map((dia) => {
        const clases = [`esperado-${dia.esperado.tipo}`]
        if (dia.marca && !dia.cuenta && dia.marca.estado_aprobacion !== "rechazada") {
            clases.push("no-cuenta")
        }
        const fila = `<tr class="${clases.join(" ")}" data-fecha="${dia.fecha}">
            <td class="libro-fecha"><strong>${Number(dia.fecha.slice(8))}</strong> <span>${DIAS_CORTOS[dia.diaSemana]}</span></td>
            <td>${escaparHtml(textoEsperado(dia.esperado))}</td>
            <td>${escaparHtml(textoMarca(dia.marca))}${dia.marca?.observaciones ? `<div class="texto-suave">${escaparHtml(dia.marca.observaciones)}</div>` : ""}</td>
            <td class="numero">${escaparHtml(minutosATexto(dia.minutosDescuento))}${dia.compensado ? `<div class="texto-suave">compensó ${dia.compensado} min</div>` : ""}</td>
            <td class="numero">${escaparHtml(minutosATexto(dia.minutosExtra))}</td>
            <td>${dia.marca ? insignia("aprobacion", dia.marca.estado_aprobacion) : ""}</td>
            <td class="libro-avisos">${dia.advertencias.map((a) => escaparHtml(a)).join("<br>")}</td>
            <td class="libro-acciones">${accionesDeFila(dia)}</td>
        </tr>`
        return fila + (filaEnEdicion === dia.fecha ? editorDeFila(dia) : "")
    }).join("")
}

function editorDeFila(dia) {
    const m = dia.marca
    const tipo = m ? (m.tipo === "atraso" ? "normal" : m.tipo) : "normal"
    const noLaboral = dia.esperado.tipo === "libre" || dia.esperado.tipo === "feriado"
    const tipos = noLaboral ? { normal: TIPOS_MARCA.normal } : TIPOS_MARCA
    const ayuda = noLaboral
        ? "Trabajo en día libre o feriado: indica entrada y salida. Todas las horas se proponen como extra."
        : `La hora que quede vacía se entiende según horario (${textoEsperado(dia.esperado)}).`
    return `<tr class="libro-editor"><td colspan="8">
        <form id="formMarca" class="form-marca">
            <label>Tipo<select id="tipoMarca">${Object.entries(tipos).map(([v, t]) => `<option value="${v}"${v === tipo ? " selected" : ""}>${escaparHtml(t)}</option>`).join("")}</select></label>
            <label class="solo-hora">Entrada real<input type="time" id="entradaMarca" value="${escaparHtml((m?.hora_entrada ?? "").slice(0, 5))}"></label>
            <label class="solo-hora">Salida real<input type="time" id="salidaMarca" value="${escaparHtml((m?.hora_salida ?? "").slice(0, 5))}"></label>
            <label class="campo-ancho">Observaciones<input type="text" id="obsMarca" maxlength="300" value="${escaparHtml(m?.observaciones ?? "")}"></label>
            <div class="acciones-grupo">
                <button type="submit">Guardar</button>
                ${m ? `<button type="button" class="peligro chico" id="eliminarMarca">Eliminar anotación</button>` : ""}
                <button type="button" class="secundario" id="cancelarMarca">Cancelar</button>
            </div>
            <p class="texto-suave campo-ancho">${escaparHtml(ayuda)}</p>
        </form>
    </td></tr>`
}

function mostrarCamposHora() {
    const conHora = document.getElementById("tipoMarca")?.value === "normal"
    document.querySelectorAll(".form-marca .solo-hora").forEach((campo) => { campo.hidden = !conHora })
}

function abrirEditor(fecha) {
    filaEnEdicion = fecha
    dibujarFilas()
    mostrarCamposHora()
    document.getElementById("tipoMarca").addEventListener("change", mostrarCamposHora)
    document.getElementById("formMarca").addEventListener("submit", guardarMarca)
    document.getElementById("cancelarMarca").addEventListener("click", () => { filaEnEdicion = null; dibujarFilas() })
    document.getElementById("eliminarMarca")?.addEventListener("click", eliminarMarca)
    document.getElementById("entradaMarca").focus()
}

// ---------- Acciones ----------

async function guardarMarca(evento) {
    evento.preventDefault()
    limpiarMensajes()
    const dia = libro.dias.find((d) => d.fecha === filaEnEdicion)
    const tipo = document.getElementById("tipoMarca").value
    const cuerpo = {
        tipo,
        hora_entrada: tipo === "normal" ? document.getElementById("entradaMarca").value || null : null,
        hora_salida: tipo === "normal" ? document.getElementById("salidaMarca").value || null : null,
        observaciones: document.getElementById("obsMarca").value.trim() || null
    }
    const resultado = dia.marca
        ? await llamarApi(`/api/asistencias/${dia.marca.id}`, { method: "PATCH", body: JSON.stringify(cuerpo) })
        : await llamarApi("/api/asistencias", { method: "POST", body: JSON.stringify({ ...cuerpo, trabajador_id: libro.trabajador_id, fecha: dia.fecha, fuente: "manual" }) })
    if (resultado.status !== 200 && resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo guardar la anotación")
        return
    }
    mensaje("info", `Anotación del ${fechaCorta(dia.fecha)} guardada: queda pendiente de aprobación.`)
    await cargarLibro()
}

async function eliminarMarca() {
    const dia = libro.dias.find((d) => d.fecha === filaEnEdicion)
    if (!confirm(`¿Eliminar la anotación del ${fechaCorta(dia.fecha)}? El día vuelve a considerarse trabajado según horario.`)) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/asistencias/${dia.marca.id}`, { method: "DELETE" })
    if (resultado.status !== 204 && resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo eliminar la anotación")
        return
    }
    mensaje("info", "Anotación eliminada.")
    await cargarLibro()
}

document.getElementById("filasLibro").addEventListener("click", async function (evento) {
    const anotar = evento.target.closest("[data-anotar]")?.dataset.anotar
    if (anotar) {
        limpiarMensajes()
        abrirEditor(anotar)
        return
    }
    const boton = evento.target.closest("[data-estado]")
    if (!boton) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/asistencias/${boton.dataset.id}/aprobacion`, { method: "PATCH", body: JSON.stringify({ estado: boton.dataset.estado }) })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cambiar el estado")
        return
    }
    await cargarLibro()
})

document.getElementById("aprobarMes").addEventListener("click", async function () {
    const { anio, mes } = anioMes()
    if (!confirm(`¿Aprobar las ${libro.totales.marcas_pendientes} anotaciones pendientes de ${NOMBRES_MES[mes - 1].toLowerCase()} ${anio}? Revisa antes los días con avisos.`)) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi("/api/asistencias/aprobar-mes", { method: "POST", body: JSON.stringify({ trabajador_id: libro.trabajador_id, anio, mes }) })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo aprobar el mes")
        return
    }
    mensaje("info", `${resultado.datos.aprobadas} anotaciones aprobadas.`)
    await cargarLibro()
})

// ---------- Selección ----------

campoTrabajador.addEventListener("change", () => { limpiarMensajes(); cargarLibro() })
campoMes.addEventListener("change", () => { limpiarMensajes(); cargarLibro() })

function moverMes(delta) {
    const { anio, mes } = anioMes()
    const fecha = new Date(Date.UTC(anio, mes - 1 + delta, 1))
    campoMes.value = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`
    limpiarMensajes()
    cargarLibro()
}
document.getElementById("mesAnterior").addEventListener("click", () => moverMes(-1))
document.getElementById("mesSiguiente").addEventListener("click", () => moverMes(1))

let mesGuardado = null
try { mesGuardado = localStorage.getItem("libro-mes") } catch { /* sin almacenamiento */ }
campoMes.value = new URLSearchParams(location.search).get("mes") ?? mesGuardado ?? hoyIso().slice(0, 7)

document.addEventListener("empresa-lista", () => { limpiarMensajes(); cargarTrabajadores() })
