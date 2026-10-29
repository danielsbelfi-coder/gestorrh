// La sesión viaja en una cookie que el JavaScript no puede leer (HttpOnly): aquí no se guarda ningún token de sesión.
// Lo único que se guarda es el token CSRF, que el servidor exige en la cabecera X-CSRF-Token de toda petición
// que escribe. Solo no sirve para entrar (hace falta la cookie); se guarda por pestaña (sessionStorage).
const CLAVE_CSRF = "csrf"

function guardarCsrf(token) {
    try {
        if (token) {
            sessionStorage.setItem(CLAVE_CSRF, token)
        } else {
            sessionStorage.removeItem(CLAVE_CSRF)
        }
    } catch {
        // Sin almacenamiento: se vuelve a pedir al servidor cuando haga falta.
    }
}

function leerCsrf() {
    try {
        return sessionStorage.getItem(CLAVE_CSRF)
    } catch {
        return null
    }
}

// El token viene en GET /api/auth/usuario (también en la respuesta del login y del cambio de contraseña).
async function renovarCsrf() {
    const respuesta = await fetch("/api/auth/usuario")
    if (respuesta.ok) {
        guardarCsrf((await respuesta.json()).csrf_token)
    }
    return leerCsrf()
}

const METODOS_QUE_ESCRIBEN = ["POST", "PUT", "PATCH", "DELETE"]

async function llamarApi(ruta, opciones = {}, reintento = false) {
    const metodo = String(opciones.method ?? "GET").toUpperCase()
    const headers = {
        "Content-Type": "application/json"
    }

    if (METODOS_QUE_ESCRIBEN.includes(metodo) && ruta !== "/api/auth/login") {
        headers["X-CSRF-Token"] = leerCsrf() ?? await renovarCsrf() ?? ""
    }
    agregarEmpresa(headers)

    const respuesta = await fetch(ruta, {
        ...opciones,
        headers: headers
    })

    if (respuesta.status === 401 && ruta !== "/api/auth/login") {
        sesionVencida()
    }

    const datos = respuesta.status === 204 ? null : await respuesta.json()

    // Token CSRF viejo (por ejemplo, la sesión se renovó en otra pestaña): se pide uno nuevo y se reintenta una vez.
    if (respuesta.status === 403 && datos?.codigo === "csrf" && !reintento && ruta !== "/api/auth/login") {
        guardarCsrf(null)
        return llamarApi(ruta, opciones, true)
    }

    if (ruta === "/api/auth/usuario" && respuesta.ok) {
        guardarCsrf(datos.csrf_token)
    }

    if (respuesta.status === 403 && datos?.codigo === "acceso_soporte") {
        accesoDeSoporteTerminado(datos.error)
    }

    return { status: respuesta.status, datos }
}

// A dónde ir después de ingresar (login o código del 2FA), según los pasos pendientes.
function destinoTrasIngreso(datos) {
    if (datos.paso === "2fa") {
        return "verificar-2fa.html"
    }
    if (datos.debeCambiarPassword === true) {
        return "cambiar-password.html"
    }
    if (datos.cuentaCancelada === true) {
        return "empresas.html"
    }
    return "index.html"
}

// Empresa de trabajo en la cabecera X-Empresa. El servidor la usa para limitar a soporte a la empresa elegida
// (y a una que el cliente haya autorizado); para los demás usuarios hoy no cambia nada.
function agregarEmpresa(headers) {
    const id = empresaActual()
    if (id !== null) {
        headers["X-Empresa"] = String(id)
    }
    return headers
}

// El acceso de soporte a la empresa elegida venció o fue revocado: se avisa y se vuelve al panel de soporte,
// que muestra los accesos vigentes. No se recarga la misma página para no repetir el error.
function accesoDeSoporteTerminado(texto) {
    olvidarEmpresaActual()
    alert(`${texto}. El acceso pudo vencer o el cliente lo revocó.`)
    window.location.href = "soporte.html"
}

// Sesión terminada (vencida, cerrada en otro lado o inexistente): se vuelve al login.
function sesionVencida() {
    guardarCsrf(null)
    window.location.href = "login.html"
}

// Botón "Cerrar sesión": el servidor borra la sesión, así que la cookie deja de servir aunque alguien la haya copiado.
async function cerrarSesion() {
    try {
        await llamarApi("/api/auth/logout", { method: "POST" })
    } finally {
        sesionVencida()
    }
}

// Antes la sesión era un token guardado en el navegador. Se borra si quedó de una versión anterior.
// La comprobación real de la sesión la hace la primera llamada a la API (un 401 lleva al login).
function requiereLogin() {
    try {
        localStorage.removeItem("token")
    } catch {
        // Sin almacenamiento: no hay nada que borrar.
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
    const respuesta = await fetch(ruta, { headers: agregarEmpresa({}) })

    if (respuesta.status === 401) {
        sesionVencida()
    }

    if (!respuesta.ok) {
        const datos = await respuesta.json()
        if (respuesta.status === 403 && datos?.codigo === "acceso_soporte") {
            accesoDeSoporteTerminado(datos.error)
        }
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

function olvidarEmpresaActual() {
    try {
        localStorage.removeItem("empresa_id")
    } catch {
        // Sin almacenamiento: no hay nada que borrar.
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
