requiereLogin()

// Paquete AH. Mismas columnas que src/trabajadores/importacion_previsiones.js
const COLUMNAS = ["rut", "dv", "desde", "afp", "ex_caja", "cotiza_desahucio", "sistema_salud", "isapre", "plan_isapre_uf"]

let filas = []

document.getElementById("btnPlantilla").addEventListener("click", async function () {
    limpiarMensajes()
    const resultado = await descargarArchivo("/api/personas/importar-previsiones/plantilla.xlsx")
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo descargar la plantilla")
    }
})

document.getElementById("btnPlantillaCsv").addEventListener("click", function () {
    descargarCsv("plantilla-cambios-prevision.csv", COLUMNAS.map((columna) => [columna, () => ""]), [])
})

async function cargarGuia() {
    const resultado = await llamarApi("/api/personas/importar-previsiones/guia")
    if (resultado.status !== 200) {
        return
    }
    document.getElementById("tablaColumnas").innerHTML = `<table class="tabla-ayuda"><tbody>${resultado.datos.columnas.map((c) => `
        <tr><td><strong>${escaparHtml(c.columna)}</strong>${c.obligatoria === "sí" ? " *" : ""}</td><td>${escaparHtml(c.ayuda)}</td></tr>`).join("")}
    </tbody></table>`
    document.getElementById("tablaValores").innerHTML = `<table class="tabla-ayuda"><tbody>${resultado.datos.valores.map((g) => `
        <tr><td><strong>${escaparHtml(g.columna)}</strong></td><td>${g.valores.map((v) => escaparHtml(v)).join(" · ")}</td></tr>`).join("")}
    </tbody></table>`
}

cargarGuia()

const nombreColumna = (titulo) => normalizar(titulo).trim().replace(/\s+/g, "_")

async function revisar(confirmar) {
    limpiarMensajes()
    const resultado = await llamarApi("/api/personas/importar-previsiones", {
        method: "POST",
        body: JSON.stringify({ empresa_id: empresaActual(), filas, confirmar })
    })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo revisar la planilla")
        return null
    }
    return resultado.datos
}

function textoDesde(desde) {
    return desde === "1900-01-01" ? "Desde siempre (corrige la inicial)" : desde.slice(0, 7).split("-").reverse().join("-")
}

function textoPension(c) {
    if (c.regimen === "IPS") {
        return `IPS: ${c.ex_caja ?? "ex-caja"}${c.cotiza_desahucio ? ", con desahucio" : ""}`
    }
    return c.afp ?? "Sin AFP"
}

function textoSalud(c) {
    if (c.sistema_salud === "Isapre") {
        return `${c.isapre ?? "Isapre"} (${Number(c.plan_isapre_uf).toLocaleString("es-CL", { maximumFractionDigits: 4 })} UF)`
    }
    return c.sistema_salud ?? "Sin informar"
}

function mostrarRevision(datos) {
    const panel = document.getElementById("panelRevision")
    const boton = document.getElementById("btnConfirmar")
    const resumen = document.getElementById("resumenRevision")
    const tabla = document.getElementById("tablaRevision")
    panel.hidden = false

    if (datos.errores.length > 0) {
        boton.hidden = true
        resumen.innerHTML = `<span class="insignia peligro">${datos.errores.length} fila(s) con errores</span> de ${datos.total}. Corrige la planilla y vuelve a subirla; no se cargó nada.`
        tabla.innerHTML = `<table><thead><tr><th>Fila</th><th>RUT</th><th>Errores</th></tr></thead><tbody>${datos.errores.map((e) => `
            <tr><td class="numero">${escaparHtml(e.fila)}</td><td>${escaparHtml(e.rut)}</td><td class="celda-larga">${escaparHtml(e.motivos.join("; "))}</td></tr>`).join("")}
        </tbody></table>`
        return
    }

    boton.hidden = false
    boton.textContent = `Registrar ${datos.cambios.length} cambio(s)`
    resumen.innerHTML = `<span class="insignia exito">Todo correcto</span> ${datos.cambios.length} cambio(s). Así quedará la previsión desde cada mes; revisa y presiona "Registrar".`
    tabla.innerHTML = `<table><thead><tr><th>Fila</th><th>RUT</th><th>Nombre</th><th>Desde</th><th>Previsión</th><th>Salud</th></tr></thead><tbody>${datos.cambios.map((c) => `
        <tr><td class="numero">${escaparHtml(c.fila)}</td><td>${escaparHtml(c.rut)}</td><td>${escaparHtml(c.nombre)}</td><td>${escaparHtml(textoDesde(c.desde))}</td><td>${escaparHtml(textoPension(c))}</td><td>${escaparHtml(textoSalud(c))}</td></tr>`).join("")}
    </tbody></table>`
}

const campoArchivo = document.getElementById("archivo")
const botonRevisar = document.getElementById("btnRevisar")

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
    if (exigirEmpresaActual() === null) {
        return
    }

    const matriz = leerCsv(await leerArchivo(archivo))
    if (matriz.length < 2) {
        mensaje("error", "La planilla no tiene filas con datos.")
        return
    }

    const encabezado = matriz[0].map(nombreColumna)
    const faltantes = COLUMNAS.filter((columna) => !encabezado.includes(columna))
    if (faltantes.length > 0) {
        mensaje("error", `A la planilla le faltan columnas: ${faltantes.join(", ")}. Usa la plantilla sin cambiar los títulos.`)
        return
    }

    filas = matriz.slice(1)
        .map((valores) => Object.fromEntries(encabezado.map((columna, i) => [columna, (valores[i] ?? "").trim()])))
        .filter((fila) => COLUMNAS.some((columna) => fila[columna] !== ""))
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
    if (!confirm(`¿Registrar ${filas.length} cambio(s) de previsión en la empresa elegida?`)) {
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
    campoArchivo.value = ""
    filas = []
    document.getElementById("nombreArchivo").textContent = "Ningún archivo elegido"
    botonRevisar.disabled = true
    mensaje("info", `Listo: se registraron ${datos.registrados} cambio(s) de previsión de ${datos.personas} persona(s). Los ves en el historial de previsión de cada ficha.`)
})
