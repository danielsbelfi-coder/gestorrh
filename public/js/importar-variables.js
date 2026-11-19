requiereLogin()

// Carga masiva de variables del mes (ver src/remuneraciones/importacion_variables.js).
const selectorPeriodo = document.getElementById("periodo")
const campoArchivo = document.getElementById("archivo")
const botonRevisar = document.getElementById("btnRevisar")
let periodos = []
let matriz = []

function periodoElegido() {
    return periodos.find((p) => String(p.id) === selectorPeriodo.value) ?? null
}

async function cargarConceptos() {
    const resultado = await llamarApi(`/api/conceptos?empresa_id=${empresaActual()}`)
    if (resultado.status !== 200) {
        return
    }
    const importables = resultado.datos
        .filter((c) => c.activo !== false && ["haber", "descuento"].includes(c.tipo) && !c.calculado_por_sistema
            && (c.recargo_hora_extra === null || c.recargo_hora_extra === undefined))
        .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, "es"))
    const selector = document.getElementById("conceptosPlantilla")
    selector.innerHTML = importables.map((c) => `<option value="${escaparHtml(c.codigo)}"${c.codigo === "ANTICIPO" ? " selected" : ""}>${escaparHtml(c.nombre)} (${c.tipo})</option>`).join("")
    document.getElementById("tablaConceptos").innerHTML = `<table class="tabla-ayuda"><thead><tr><th>Título de la columna</th><th>Código</th><th>Tipo</th></tr></thead><tbody>${importables.map((c) => `
        <tr><td><strong>${escaparHtml(c.nombre)}</strong></td><td>${escaparHtml(c.codigo)}</td><td>${c.tipo === "descuento" ? "Descuento" : "Haber"}</td></tr>`).join("")}
    </tbody></table>`
}

document.getElementById("btnPlantilla").addEventListener("click", async function () {
    limpiarMensajes()
    const periodo = periodoElegido()
    if (!periodo) {
        mensaje("error", "Elige un periodo abierto.")
        return
    }
    const codigos = [...document.getElementById("conceptosPlantilla").selectedOptions].map((o) => o.value)
    const resultado = await descargarArchivo(`/api/variables/importar/plantilla.csv?periodo_id=${periodo.id}&conceptos=${encodeURIComponent(codigos.join(","))}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo descargar la plantilla")
    }
})

async function revisar(confirmar) {
    limpiarMensajes()
    const resultado = await llamarApi("/api/variables/importar", {
        method: "POST",
        body: JSON.stringify({ periodo_id: Number(selectorPeriodo.value), matriz, confirmar })
    })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo revisar la planilla")
        return null
    }
    return resultado.datos
}

function mostrarRevision(datos) {
    const panel = document.getElementById("panelRevision")
    const boton = document.getElementById("btnConfirmar")
    const resumen = document.getElementById("resumenRevision")
    const tabla = document.getElementById("tablaRevision")
    panel.hidden = false
    boton.hidden = true

    const columnas = datos.columnas
        ? `<p>Columnas reconocidas: ${datos.columnas.conceptos.map((c) => `<strong>${escaparHtml(c.titulo)}</strong> → ${escaparHtml(c.concepto)} (${c.tipo})`).join(" · ") || "ninguna"}${datos.columnas.glosa ? " · Glosa" : ""}.${datos.columnas.ignoradas.length ? ` <span class="texto-suave">Ignoradas: ${datos.columnas.ignoradas.map(escaparHtml).join(", ")}.</span>` : ""}</p>`
        : ""
    const avisos = datos.avisos.length ? `<ul class="lista-avisos">${datos.avisos.map((a) => `<li>${escaparHtml(a)}</li>`).join("")}</ul>` : ""

    if (datos.erroresEncabezado.length > 0) {
        resumen.innerHTML = `<p><span class="insignia peligro">No se puede leer la planilla</span></p><ul>${datos.erroresEncabezado.map((e) => `<li>${escaparHtml(e)}</li>`).join("")}</ul>${columnas}`
        tabla.innerHTML = ""
        return
    }
    if (datos.errores.length > 0) {
        resumen.innerHTML = `<p><span class="insignia peligro">${datos.errores.length} fila(s) con errores</span> de ${datos.filas}. Corrige la planilla y vuelve a subirla; no se cargó nada.</p>${columnas}${avisos}`
        tabla.innerHTML = `<table><thead><tr><th>Fila</th><th>RUT</th><th>Errores</th></tr></thead><tbody>${datos.errores.map((e) => `
            <tr><td class="numero">${escaparHtml(e.fila)}</td><td>${escaparHtml(e.rut)}</td><td class="celda-larga">${escaparHtml(e.motivos.join("; "))}</td></tr>`).join("")}
        </tbody></table>`
        return
    }
    if (datos.variables.length === 0) {
        resumen.innerHTML = `<p><span class="insignia advertencia">Nada que cargar</span> Todas las celdas de variables están vacías o en 0.</p>${columnas}`
        tabla.innerHTML = ""
        return
    }
    const total = (tipo) => datos.variables.filter((v) => v.tipo === tipo).reduce((s, v) => s + v.monto, 0)
    boton.hidden = false
    boton.textContent = `Cargar ${datos.variables.length} variable(s)`
    resumen.innerHTML = `<p><span class="insignia exito">Todo correcto</span> ${datos.variables.length} variable(s) de ${datos.filas} fila(s): haberes ${pesos(total("haber"))}, descuentos ${pesos(total("descuento"))}. Quedan pendientes de aprobación. Revisa la lista y presiona «Cargar».</p>${columnas}${avisos}`
    tabla.innerHTML = `<table><thead><tr><th>Fila</th><th>Trabajador</th><th>Concepto</th><th class="numero">Monto</th><th>Glosa</th></tr></thead><tbody>${datos.variables.map((v) => `
        <tr><td class="numero">${escaparHtml(v.fila)}</td><td>${escaparHtml(v.nombre)}</td><td>${escaparHtml(v.concepto)}</td><td class="numero">${escaparHtml(pesos(v.monto))}</td><td>${escaparHtml(v.glosa ?? "")}</td></tr>`).join("")}
    </tbody></table>`
}

campoArchivo.addEventListener("change", function () {
    limpiarMensajes()
    document.getElementById("panelRevision").hidden = true
    const archivo = this.files[0]
    document.getElementById("nombreArchivo").textContent = archivo ? archivo.name : "Ningún archivo elegido"
    botonRevisar.disabled = !archivo
})

botonRevisar.addEventListener("click", async function () {
    limpiarMensajes()
    document.getElementById("panelRevision").hidden = true
    const archivo = campoArchivo.files[0]
    if (!archivo) {
        mensaje("error", "Primero elige la planilla.")
        return
    }
    if (periodoElegido()?.estado !== "abierto") {
        mensaje("error", "Elige un periodo abierto.")
        return
    }
    matriz = leerCsv(await leerArchivo(archivo))
    if (matriz.length < 2) {
        mensaje("error", "La planilla no tiene filas con datos.")
        return
    }
    botonRevisar.disabled = true
    botonRevisar.textContent = "Revisando…"
    const datos = await revisar(false)
    botonRevisar.disabled = false
    botonRevisar.textContent = "Subir y revisar"
    if (datos) {
        mostrarRevision(datos)
    }
})

document.getElementById("btnConfirmar").addEventListener("click", async function () {
    const periodo = periodoElegido()
    if (!confirm(`¿Cargar las variables en el periodo ${String(periodo?.mes).padStart(2, "0")}-${periodo?.anio}? Quedan pendientes de aprobación.`)) {
        return
    }
    this.disabled = true
    const datos = await revisar(true)
    this.disabled = false
    if (!datos) {
        return
    }
    if (!datos.confirmado) {
        mostrarRevision(datos)
        return
    }
    document.getElementById("panelRevision").hidden = true
    reiniciarArchivo()
    mensaje("info", `Listo: se cargaron ${datos.variables.length} variable(s) como pendientes. Revísalas y apruébalas en Variables del mes.`)
})

function reiniciarArchivo() {
    campoArchivo.value = ""
    matriz = []
    document.getElementById("nombreArchivo").textContent = "Ningún archivo elegido"
    botonRevisar.disabled = true
}

selectorPeriodo.addEventListener("change", () => {
    limpiarMensajes()
    document.getElementById("panelRevision").hidden = true
})

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    document.getElementById("panelRevision").hidden = true
    reiniciarArchivo()
    await cargarConceptos()
    periodos = await llenarSelectorPeriodos(selectorPeriodo)
    // Solo se carga en un periodo abierto: si el elegido está cerrado, se pasa al abierto más reciente.
    const abierto = periodos.find((p) => p.estado === "abierto")
    if (abierto && periodoElegido()?.estado !== "abierto") {
        selectorPeriodo.value = abierto.id
    }
})
