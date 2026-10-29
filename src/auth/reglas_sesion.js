// Reglas puras de las sesiones guardadas en el servidor (sin base de datos), para poder probarlas.
//
// La cookie del navegador lleva un identificador aleatorio; en la base se guarda solo su hash (SHA-256),
// así una copia de la base no sirve para entrar. Cerrar sesión = borrar la fila.
const crypto = require("crypto")
const {
    SESION_MAX_HORAS,
    INACTIVIDAD_CLIENTE_MIN,
    INACTIVIDAD_PLATAFORMA_MIN,
    PENDIENTE_2FA_MIN
} = require("../shared/constantes.js")

const MINUTO = 60 * 1000
// "ultimo_uso_en" se actualiza como mucho una vez por minuto, para no escribir en la base en cada petición.
const INTERVALO_ULTIMO_USO_MS = MINUTO

// ---------- Identificadores ----------

// 32 bytes al azar (256 bits). Sirve para el identificador de la sesión y para el token CSRF.
function generarToken() {
    return crypto.randomBytes(32).toString("base64url")
}

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex")
}

// ---------- Cookie ----------

// En producción el prefijo "__Host-" obliga al navegador a exigir Secure, Path=/ y ningún dominio:
// otra aplicación de un subdominio no puede pisarla. En localhost (http) no se puede usar Secure.
function nombreCookie(produccion) {
    return produccion ? "__Host-gestorrh" : "gestorrh"
}

// Lee una cookie de la cabecera "Cookie" (formato "a=1; b=2"). Devuelve null si no está.
function leerCookie(cabecera, nombre) {
    for (const parte of String(cabecera ?? "").split(";")) {
        const igual = parte.indexOf("=")
        if (igual === -1) {
            continue
        }
        if (parte.slice(0, igual).trim() === nombre) {
            const valor = parte.slice(igual + 1).trim()
            return valor === "" ? null : valor
        }
    }
    return null
}

// Sin maxAge: es cookie de sesión del navegador. El vencimiento real lo controla el servidor.
function opcionesCookie(produccion) {
    return { httpOnly: true, sameSite: "strict", path: "/", secure: produccion === true }
}

// ---------- 2FA ----------

// Obligatorio para soporte, comercial y admins de cuenta; voluntario para los demás.
function requiere2fa(usuario) {
    return Boolean(usuario?.rol_plataforma) || usuario?.es_admin_cuenta === true
}

function debeActivar2fa(usuario) {
    return requiere2fa(usuario) && usuario?.totp_activo !== true
}

// ---------- Vigencia ----------

function minutosInactividad(usuario) {
    return usuario?.rol_plataforma ? INACTIVIDAD_PLATAFORMA_MIN : INACTIVIDAD_CLIENTE_MIN
}

// Fecha de término de una sesión nueva según su estado.
function expiracionNueva(estado, ahora = new Date()) {
    const minutos = estado === "pendiente_2fa" ? PENDIENTE_2FA_MIN : SESION_MAX_HORAS * 60
    return new Date(ahora.getTime() + minutos * MINUTO)
}

// null si la sesión sirve; "vencida" si pasó su máximo; "inactiva" si pasó el tiempo sin uso.
function motivoInvalidez(sesion, usuario, ahora = new Date()) {
    const instante = ahora.getTime()

    if (new Date(sesion.expira_en).getTime() <= instante) {
        return "vencida"
    }
    const ultimoUso = new Date(sesion.ultimo_uso_en).getTime()
    if (ultimoUso + minutosInactividad(usuario) * MINUTO <= instante) {
        return "inactiva"
    }
    return null
}

function debeActualizarUltimoUso(sesion, ahora = new Date()) {
    return ahora.getTime() - new Date(sesion.ultimo_uso_en).getTime() >= INTERVALO_ULTIMO_USO_MS
}

// ---------- Pasos obligatorios ----------

// En qué paso está el usuario. Orden: primero el código del 2FA, después cambiar la contraseña
// y al final inscribir el 2FA (un usuario nuevo o restablecido no tiene 2FA todavía).
function estadoDeAcceso(sesion, usuario) {
    if (sesion?.estado === "pendiente_2fa") {
        return "pendiente_2fa"
    }
    if (usuario?.debe_cambiar_password === true) {
        return "cambiar_password"
    }
    if (debeActivar2fa(usuario)) {
        return "activar_2fa"
    }
    return "normal"
}

const RUTAS_SIEMPRE = ["POST /api/auth/logout", "GET /api/auth/usuario"]

const RUTAS_POR_ESTADO = {
    // Con la sesión pendiente solo se puede escribir el código (o salir): ni siquiera se muestran los datos del usuario.
    pendiente_2fa: ["POST /api/auth/2fa/verificar", "POST /api/auth/logout"],
    cambiar_password: [...RUTAS_SIEMPRE, "PATCH /api/auth/cambiar-password"],
    activar_2fa: [...RUTAS_SIEMPRE, "POST /api/auth/2fa/inscripcion/iniciar", "POST /api/auth/2fa/inscripcion/confirmar"]
}

const MENSAJES_ESTADO = {
    pendiente_2fa: "Debes ingresar el código de verificación",
    cambiar_password: "Debes cambiar contraseña antes de continuar",
    activar_2fa: "Debes activar la verificación en dos pasos antes de continuar"
}

function rutaPermitida(estado, metodo, url) {
    if (estado === "normal") {
        return true
    }
    const ruta = String(url ?? "").split("?")[0]
    const lista = RUTAS_POR_ESTADO[estado] ?? []
    return lista.includes(`${String(metodo).toUpperCase()} ${ruta}`)
}

function mensajeDeEstado(estado) {
    return MENSAJES_ESTADO[estado] ?? null
}

// ---------- CSRF ----------

const METODOS_SEGUROS = ["GET", "HEAD", "OPTIONS"]

function metodoQueEscribe(metodo) {
    return !METODOS_SEGUROS.includes(String(metodo).toUpperCase())
}

function normalizarOrigen(origen) {
    return String(origen ?? "").trim().toLowerCase().replace(/\/+$/, "")
}

// La petición debe venir de la propia aplicación. Los navegadores mandan "Origin" en todo POST/PUT/PATCH/DELETE;
// si no viene, se acepta solo con "Sec-Fetch-Site: same-origin". Sin ninguna de las dos se rechaza.
function origenPermitido({ origin, secFetchSite } = {}, appOrigen) {
    if (origin !== undefined && origin !== null && origin !== "") {
        return normalizarOrigen(appOrigen) !== "" && normalizarOrigen(origin) === normalizarOrigen(appOrigen)
    }
    return secFetchSite === "same-origin"
}

// Compara el token CSRF enviado en la cabecera con el de la sesión, en tiempo constante.
function csrfValido(enviado, esperado) {
    if (typeof enviado !== "string" || typeof esperado !== "string" || enviado === "" || esperado === "") {
        return false
    }
    const a = Buffer.from(enviado)
    const b = Buffer.from(esperado)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

module.exports = {
    generarToken,
    hashToken,
    nombreCookie,
    leerCookie,
    opcionesCookie,
    requiere2fa,
    debeActivar2fa,
    minutosInactividad,
    expiracionNueva,
    motivoInvalidez,
    debeActualizarUltimoUso,
    estadoDeAcceso,
    rutaPermitida,
    mensajeDeEstado,
    metodoQueEscribe,
    origenPermitido,
    csrfValido
}
