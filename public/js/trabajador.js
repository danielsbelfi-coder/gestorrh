requiereLogin()

const trabajadorId = Number(new URLSearchParams(location.search).get("id"))

let trabajador = null
let persona = null
let cargoPorId = new Map()
let contratos = []
let contratoParaAnexo = null
let primeraEmpresa = true

function dato(titulo, valor) {
    return `<div><dt>${escaparHtml(titulo)}</dt><dd>${valor}</dd></div>`
}

async function cargarFicha() {
    const resultado = await llamarApi(`/api/trabajadores/${trabajadorId}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar el trabajador")
        return false
    }
    trabajador = resultado.datos

    const listas = await cargarListas([`/api/personas/${trabajador.persona_id}`, "/api/cargos", "/api/contratos"])
    if (!listas) {
        return false
    }
    persona = listas[0]
    cargoPorId = porId(listas[1])
    contratos = listas[2]
        .filter((c) => c.trabajador_id === trabajador.id)
        .sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)))

    const nombre = nombreCompleto(persona)
    document.title = `GestorRH - ${nombre}`
    document.getElementById("titulo").textContent = nombre
    document.getElementById("subtitulo").textContent = `RUT ${formatearRut(persona.rut, persona.dv)} · trabajador #${trabajador.id}`
    document.getElementById("estadoActual").innerHTML = insignia("trabajador", trabajador.estado)

    const rut = encodeURIComponent(formatearRut(persona.rut, persona.dv))
    document.getElementById("enlaces").innerHTML = `
        <a class="boton secundario chico" href="persona.html?id=${persona.id}">Datos personales y previsión</a>
        <a class="boton secundario chico" href="asistencias.html?buscar=${rut}">Asistencia</a>
        <a class="boton secundario chico" href="liquidaciones.html?buscar=${rut}">Liquidaciones</a>
        ${trabajador.fecha_termino ? `<a class="boton secundario chico" href="finiquitos.html?buscar=${rut}">Finiquito</a>` : ""}`

    const vigente = contratos.find((c) => c.estado === "vigente")
    document.getElementById("relacion").innerHTML = [
        dato("Ingreso", escaparHtml(fechaCorta(trabajador.fecha_ingreso) || "—")),
        dato("Término", escaparHtml(fechaCorta(trabajador.fecha_termino) || "—")),
        dato("Causal de término", escaparHtml(CAUSALES[trabajador.causal_termino] ?? "—")),
        dato("Cargo actual", escaparHtml(vigente ? cargoPorId.get(vigente.cargo_id)?.nombre ?? "—" : "Sin contrato vigente")),
        dato("Sueldo base actual", escaparHtml(vigente ? pesos(vigente.sueldo_base) : "—"))
    ].join("")

    const botonNuevo = document.getElementById("nuevoContrato")
    botonNuevo.hidden = Boolean(vigente) || Boolean(trabajador.fecha_termino)
    botonNuevo.href = `contratos.html?trabajador=${trabajador.id}`

    await dibujarContratos()
    return true
}

async function dibujarContratos() {
    const contenedor = document.getElementById("contratos")
    if (contratos.length === 0) {
        contenedor.innerHTML = `<p class="texto-suave">Sin contratos. ${trabajador.estado === "postulante" ? "Al crear su contrato, el postulante pasa a trabajador activo." : ""}</p>`
        return
    }

    const anexos = await Promise.all(contratos.map(async (contrato) => {
        const resultado = await llamarApi(`/api/contratos/${contrato.id}/anexos`)
        return resultado.status === 200 ? resultado.datos : []
    }))

    contenedor.innerHTML = contratos.map((c, i) => `
        <article class="contrato">
            <header class="contrato-cabecera">
                <div>
                    <strong>Contrato #${c.id} · ${escaparHtml(TEXTOS.tipoContrato[c.tipo_contrato] ?? c.tipo_contrato)}</strong>
                    <span class="texto-suave"> desde ${escaparHtml(fechaCorta(c.fecha_inicio))}${c.fecha_termino ? ` hasta ${escaparHtml(fechaCorta(c.fecha_termino))}` : ""}</span>
                </div>
                <div class="contrato-estados">
                    ${insignia("contrato", c.estado)}
                    ${insignia("firma", c.estado_firma).replace(">Pendiente<", ">Firma pendiente<")}
                    ${c.estado_firma === "pendiente" ? `<button type="button" class="chico" data-firmar-contrato="${c.id}">Firmar contrato</button>` : ""}
                    ${c.estado === "vigente" ? `<button type="button" class="chico secundario" data-nuevo-anexo="${c.id}">＋ Anexo</button>` : ""}
                    <button type="button" class="chico secundario" data-pdf-contrato="${c.id}">PDF</button>
                </div>
            </header>
            <dl class="datos">
                ${dato("Cargo", escaparHtml(cargoPorId.get(c.cargo_id)?.nombre ?? "—"))}
                ${dato("Sueldo base", escaparHtml(pesos(c.sueldo_base)))}
                ${dato("Jornada", escaparHtml(`${valorContrato("tipo_jornada", c.tipo_jornada)} · ${c.horas_semanales} h · ${c.dias_trabajados} días`))}
                ${dato("Sistema / pago", escaparHtml(`${valorContrato("sistema_remuneracion", c.sistema_remuneracion)} · ${valorContrato("periodicidad_pago", c.periodicidad_pago)}`))}
                ${dato("Comuna de prestación", escaparHtml(valorContrato("comuna_prestacion", c.comuna_prestacion)))}
                ${dato("Lugar", escaparHtml(c.lugar_prestacion_servicios ?? "—"))}
                ${dato("Funciones", escaparHtml(c.funciones ?? "—"))}
                ${dato("Firma", escaparHtml(c.fecha_firma ? fechaCorta(c.fecha_firma) : "Pendiente"))}
            </dl>
            ${anexos[i].length === 0 ? `<p class="texto-suave">Sin anexos.</p>` : `
                <table class="tabla-anexos">
                    <thead><tr><th>Rige desde</th><th>Campo</th><th>Antes</th><th>Después</th><th>Motivo</th><th>Firma</th><th></th></tr></thead>
                    <tbody>${anexos[i].map((a) => `
                        <tr>
                            <td>${escaparHtml(fechaCorta(a.fecha_vigencia))}</td>
                            <td>${escaparHtml(CAMPOS_ANEXO[a.campo_modificado]?.texto ?? a.campo_modificado)}</td>
                            <td>${escaparHtml(valorContrato(a.campo_modificado, a.valor_anterior))}</td>
                            <td><strong>${escaparHtml(valorContrato(a.campo_modificado, a.valor_nuevo))}</strong></td>
                            <td>${escaparHtml(a.motivo ?? "")}</td>
                            <td>${insignia("firma", a.estado_firma)}</td>
                            <td>${a.estado_firma === "pendiente" ? `<button type="button" class="chico" data-firmar-anexo="${a.id}" data-contrato="${c.id}">Firmar</button>` : ""}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>`}
        </article>`).join("")
}

// ---------- Anexos ----------

llenarSelect(document.getElementById("campoAnexo"),
    Object.entries(CAMPOS_ANEXO).map(([campo, def]) => ({ id: campo, texto: def.texto })))

// Cambia el campo "Nuevo valor" según lo que se modifica (número, lista, fecha o comuna).
function prepararCampoValor() {
    const definicion = CAMPOS_ANEXO[document.getElementById("campoAnexo").value]
    const contenedor = document.getElementById("contenedorValor")
    let control
    if (definicion.tipo === "lista") {
        control = `<select id="valorAnexo" required>${Object.entries(definicion.opciones).map(([v, t]) => `<option value="${escaparHtml(v)}">${escaparHtml(t)}</option>`).join("")}</select>`
    } else if (definicion.tipo === "numero") {
        control = `<input type="number" id="valorAnexo" min="0" step="any" required>`
    } else if (definicion.tipo === "fecha") {
        control = `<input type="date" id="valorAnexo" required>`
    } else if (definicion.tipo === "comuna") {
        control = `<input type="search" id="valorAnexo" placeholder="Escribe la comuna…" required>`
    } else {
        control = `<input type="text" id="valorAnexo" required>`
    }
    contenedor.innerHTML = `Nuevo valor${control}`
    if (definicion.tipo === "comuna") {
        llenarBuscador(document.getElementById("valorAnexo"),
            Object.entries(COMUNAS).map(([codigo, nombre]) => ({ id: codigo, texto: `${nombre} (${codigo})` })))
    }
}

document.getElementById("campoAnexo").addEventListener("change", prepararCampoValor)

function abrirAnexo(contratoId) {
    contratoParaAnexo = contratos.find((c) => c.id === contratoId)
    document.getElementById("tituloAnexo").textContent = `Nuevo anexo del contrato #${contratoId}`
    document.getElementById("formAnexo").reset()
    prepararCampoValor()
    const panel = document.getElementById("panelAnexo")
    panel.hidden = false
    panel.scrollIntoView({ behavior: "smooth", block: "start" })
}

document.getElementById("cancelarAnexo").addEventListener("click", () => { document.getElementById("panelAnexo").hidden = true })

document.getElementById("formAnexo").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const campo = document.getElementById("campoAnexo").value
    const control = document.getElementById("valorAnexo")
    const valorNuevo = CAMPOS_ANEXO[campo].tipo === "comuna" ? valorBuscador(control) : control.value.trim()
    if (!valorNuevo) {
        mensaje("error", CAMPOS_ANEXO[campo].tipo === "comuna" ? "Elige una comuna de la lista de sugerencias" : "Indica el nuevo valor")
        return
    }

    const creado = await crearRegistro(`/api/contratos/${contratoParaAnexo.id}/anexos`, {
        campo_modificado: campo,
        valor_nuevo: String(valorNuevo),
        fecha_vigencia: document.getElementById("vigenciaAnexo").value,
        motivo: document.getElementById("motivoAnexo").value.trim()
    }, "Anexo creado. Queda pendiente hasta que se firme.")

    if (creado) {
        document.getElementById("panelAnexo").hidden = true
        await cargarFicha()
    }
})

// ---------- Firmas ----------

document.getElementById("contratos").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("button")
    if (!boton) {
        return
    }
    limpiarMensajes()

    if (boton.dataset.pdfContrato) {
        const resultado = await descargarArchivo(`/api/contratos/${boton.dataset.pdfContrato}/documento`)
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo generar el contrato")
        }
        return
    }

    if (boton.dataset.nuevoAnexo) {
        abrirAnexo(Number(boton.dataset.nuevoAnexo))
        return
    }

    if (boton.dataset.firmarContrato) {
        const fecha = prompt("Fecha de firma del contrato (AAAA-MM-DD). Deja hoy si se firma ahora:", hoyIso())
        if (fecha === null) {
            return
        }
        const resultado = await llamarApi(`/api/contratos/${boton.dataset.firmarContrato}/firmar`, {
            method: "PATCH",
            body: JSON.stringify({ fecha_firma: fecha.trim() })
        })
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo firmar el contrato")
            return
        }
        mensaje("info", "Contrato firmado.")
        await cargarFicha()
    }

    if (boton.dataset.firmarAnexo) {
        if (!confirm("¿Firmar este anexo? El cambio se aplica al contrato desde su fecha de vigencia.")) {
            return
        }
        const resultado = await llamarApi(`/api/contratos/${boton.dataset.contrato}/anexos/${boton.dataset.firmarAnexo}/firmar`, { method: "PATCH" })
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo firmar el anexo")
            return
        }
        mensaje("info", "Anexo firmado y aplicado al contrato.")
        await cargarFicha()
    }
})

// ---------- Inicio ----------

document.addEventListener("empresa-lista", async function () {
    if (!primeraEmpresa) {
        if (trabajador && trabajador.empresa_id !== empresaActual()) {
            location.href = "trabajadores.html"
        }
        return
    }
    primeraEmpresa = false

    if (!trabajadorId) {
        mensaje("error", "Falta el trabajador. Vuelve a la lista y elige uno.")
        return
    }

    await cargarFicha()
    if (trabajador && trabajador.empresa_id !== empresaActual()) {
        guardarEmpresaActual(trabajador.empresa_id)
        const selector = document.getElementById("empresaTrabajo")
        if (selector) {
            selector.value = trabajador.empresa_id
        }
    }
})
