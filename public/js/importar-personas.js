requiereLogin()

// Mismas columnas que src/trabajadores/importacion_personas.js
const COLUMNAS = [
    "rut", "dv", "nombres", "apellido_paterno", "apellido_materno", "nacionalidad", "fecha_nacimiento",
    "sexo", "estado_civil", "direccion", "telefono", "email", "afp", "afiliado_afc", "sistema_salud",
    "isapre", "plan_isapre_uf", "banco", "tipo_cuenta", "numero_cuenta", "crear_postulante", "fecha_ingreso"
]

let filas = []

document.getElementById("btnPlantilla").addEventListener("click", function () {
    descargarCsv("plantilla-personas.csv", COLUMNAS.map((columna) => [columna, () => ""]), [])
})

// Lee un CSV con separador ; o , y comillas. Devuelve una matriz de textos.
function leerCsv(contenido) {
    const primeraLinea = contenido.split(/\r?\n/)[0]
    const separador = (primeraLinea.match(/;/g) ?? []).length >= (primeraLinea.match(/,/g) ?? []).length ? ";" : ","
    const resultado = []
    let fila = []
    let celda = ""
    let entreComillas = false

    for (let i = 0; i < contenido.length; i++) {
        const c = contenido[i]
        if (entreComillas) {
            if (c === '"' && contenido[i + 1] === '"') {
                celda += '"'
                i++
            } else if (c === '"') {
                entreComillas = false
            } else {
                celda += c
            }
        } else if (c === '"') {
            entreComillas = true
        } else if (c === separador) {
            fila.push(celda)
            celda = ""
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && contenido[i + 1] === "\n") {
                i++
            }
            fila.push(celda)
            resultado.push(fila)
            fila = []
            celda = ""
        } else {
            celda += c
        }
    }
    if (celda !== "" || fila.length > 0) {
        fila.push(celda)
        resultado.push(fila)
    }
    return resultado.filter((f) => f.some((valor) => valor.trim() !== ""))
}

// Excel en español suele guardar el CSV en Windows-1252: si no es UTF-8 válido, se lee así.
async function leerArchivo(archivo) {
    const bytes = await archivo.arrayBuffer()
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "")
    } catch {
        return new TextDecoder("windows-1252").decode(bytes)
    }
}

const nombreColumna = (titulo) => normalizar(titulo).trim().replace(/\s+/g, "_")

async function revisar(confirmar) {
    limpiarMensajes()
    const resultado = await llamarApi("/api/personas/importar", {
        method: "POST",
        body: JSON.stringify({ empresa_id: empresaActual(), filas, confirmar })
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

    if (datos.errores.length > 0) {
        boton.hidden = true
        resumen.innerHTML = `<span class="insignia peligro">${datos.errores.length} fila(s) con errores</span> de ${datos.total}. Corrige la planilla y vuelve a subirla; no se cargó nada.`
        tabla.innerHTML = `<table><thead><tr><th>Fila</th><th>RUT</th><th>Errores</th></tr></thead><tbody>${datos.errores.map((e) => `
            <tr><td class="numero">${escaparHtml(e.fila)}</td><td>${escaparHtml(e.rut)}</td><td class="celda-larga">${escaparHtml(e.motivos.join("; "))}</td></tr>`).join("")}
        </tbody></table>`
        return
    }

    boton.hidden = false
    boton.textContent = `Cargar ${datos.total} persona(s)`
    resumen.innerHTML = `<span class="insignia exito">Todo correcto</span> ${datos.total} persona(s)${datos.postulantes ? `, ${datos.postulantes} se crearán también como postulantes` : ""}. Revisa la lista y presiona "Cargar".`
    tabla.innerHTML = `<table><thead><tr><th>Fila</th><th>RUT</th><th>Nombre</th><th>Postulante</th></tr></thead><tbody>${filas.map((f, i) => `
        <tr><td class="numero">${i + 2}</td><td>${escaparHtml(`${f.rut}-${f.dv}`)}</td><td>${escaparHtml(`${f.nombres} ${f.apellido_paterno} ${f.apellido_materno ?? ""}`)}</td><td>${escaparHtml(f.crear_postulante || "no")}</td></tr>`).join("")}
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

    filas = matriz.slice(1).map((valores) => Object.fromEntries(encabezado.map((columna, i) => [columna, (valores[i] ?? "").trim()])))
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
    if (!confirm(`¿Cargar ${filas.length} persona(s) en la empresa elegida?`)) {
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
    mensaje("info", `Listo: se crearon ${datos.creadas} persona(s)${datos.postulantes ? ` y ${datos.postulantes} postulante(s)` : ""}. Las ves en Personas y Trabajadores.`)
})

function reiniciarArchivo() {
    campoArchivo.value = ""
    filas = []
    document.getElementById("nombreArchivo").textContent = "Ningún archivo elegido"
    botonRevisar.disabled = true
}

document.addEventListener("empresa-lista", function () {
    document.getElementById("panelRevision").hidden = true
    reiniciarArchivo()
})
