async function llamarApi(ruta, opciones = {}) {
    const token = localStorage.getItem("token")

    const headers = {
        "Content-Type": "application/json"
    }

    if (token) {
        headers["Authorization"] = "Bearer " + token
    }

    const respuesta = await fetch(ruta, {
        ...opciones,
        headers: headers
    })

    if (respuesta.status === 401 && ruta !== "/api/auth/login") {
        sesionVencida()
    }

    const datos = respuesta.status === 204 ? null : await respuesta.json()

    return { status: respuesta.status, datos }
}

// Token vencido o inválido: se borra y se vuelve al login.
function sesionVencida() {
    localStorage.removeItem("token")
    window.location.href = "login.html"
}

function requiereLogin() {
    const token = localStorage.getItem("token")
    if (!token) {
        window.location.href = "login.html"
    }
}

function escaparHtml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
}

async function descargarArchivo(ruta) {
    const token = localStorage.getItem("token")

    const respuesta = await fetch(ruta, {
        headers: { "Authorization": "Bearer " + token }
    })

    if (respuesta.status === 401) {
        sesionVencida()
    }

    if (!respuesta.ok) {
        const datos = await respuesta.json()
        return { status: respuesta.status, datos }
    }

    const disposicion = respuesta.headers.get("Content-Disposition") ?? ""
    const coincidencia = disposicion.match(/filename="(.+)"/)
    const nombre = coincidencia ? coincidencia[1] : "descarga"

    const blob = await respuesta.blob()
    const url = URL.createObjectURL(blob)

    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = nombre
    enlace.click()

    setTimeout(() => URL.revokeObjectURL(url), 1000)

    const advertencias = respuesta.headers.get("X-Advertencias")

    return { status: respuesta.status, advertencias: advertencias ? JSON.parse(decodeURIComponent(advertencias)) : [] }
}

function formatearFecha(texto) {
    const [anio, mes, dia] = texto.split("-")
    return `${dia}-${mes}-${anio}`
}

function mostrarProblemas(idLista, problemas) {
    document.getElementById(idLista).innerHTML = problemas.map(function (problema) {
        const motivos = problema.motivos ?? [problema.motivo]
        return `<li>Trabajador ${problema.trabajador_id}: ${escaparHtml(motivos.join("; "))}</li>`
    }).join("")
}

// Empresa de trabajo: la elige el usuario en la barra superior y se recuerda en este navegador.
function empresaActual() {
    try {
        return Number(localStorage.getItem("empresa_id")) || null
    } catch {
        return null
    }
}

function guardarEmpresaActual(id) {
    try {
        localStorage.setItem("empresa_id", String(id))
    } catch {
        // Sin almacenamiento disponible: la elección dura hasta recargar la página.
    }
}

// Deja solo los registros de la empresa de trabajo. obtenerEmpresa dice dónde está el id de empresa de cada registro.
function deEmpresaActual(lista, obtenerEmpresa = (registro) => registro.empresa_id) {
    const id = empresaActual()
    return id === null ? lista : lista.filter((registro) => Number(obtenerEmpresa(registro)) === id)
}

// Para formularios que crean registros de la empresa de trabajo.
function exigirEmpresaActual() {
    const id = empresaActual()
    if (id === null) {
        document.getElementById("mensajeError").textContent = "Primero elige una empresa en la barra superior"
    }
    return id
}

const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"]

function nombrePeriodo(periodo) {
    return `${NOMBRES_MES[periodo.mes - 1]} ${periodo.anio}`
}
