// Revisa la configuración (variables de entorno) antes de arrancar el servidor.
// Devuelve { errores, advertencias }: con errores el servidor no parte.
const fs = require("fs")
const { leerClave } = require("../auth/cifrado.js")

const REQUERIDAS_BD = ["DB_NAME", "DB_USER", "DB_HOST", "DB_DIALECT"]

const HOSTS_LOCALES = ["localhost", "127.0.0.1", "::1"]

// Origen de la aplicación (protocolo + dominio + puerto, sin ruta), con el que se revisa la cabecera Origin
// de cada petición que escribe (protección CSRF). En desarrollo, si falta, se usa http://localhost:PORT.
function origenDeLaApp(env) {
    const valor = String(env.APP_ORIGEN ?? "").trim().replace(/\/+$/, "")
    if (valor !== "") {
        return valor.toLowerCase()
    }
    return env.NODE_ENV === "production" ? "" : `http://localhost:${env.PORT || 3000}`
}

// Devuelve el texto del problema o null. Debe ser solo origen: "https://algo.com" o "http://localhost:3000".
function problemaDeOrigen(valor, produccion) {
    let url
    try {
        url = new URL(valor)
    } catch {
        return "APP_ORIGEN no es una dirección válida (ejemplo: https://gestorrh.onrender.com)"
    }
    if (url.origin.toLowerCase() !== valor.toLowerCase()) {
        return "APP_ORIGEN debe ser solo el origen, sin ruta ni barra final (ejemplo: https://gestorrh.onrender.com)"
    }
    if (produccion && url.protocol !== "https:") {
        return "En producción APP_ORIGEN debe usar https"
    }
    return null
}

function validarConfiguracion(env, existeArchivo = fs.existsSync) {
    const errores = []
    const advertencias = []
    const produccion = env.NODE_ENV === "production"

    for (const nombre of REQUERIDAS_BD) {
        if (!env[nombre] || String(env[nombre]).trim() === "") {
            errores.push(`Falta la variable ${nombre}`)
        }
    }
    if (produccion && !env.DB_PASSWORD) {
        errores.push("En producción la base de datos debe tener contraseña (DB_PASSWORD)")
    }

    // Conexión cifrada a la base y comprobación del certificado del servidor.
    const conSsl = env.DB_SSL === "true"
    if (!conSsl && produccion && !HOSTS_LOCALES.includes(String(env.DB_HOST ?? "").trim())) {
        advertencias.push("DB_SSL no está en true: la conexión a una base de datos remota viajaría sin cifrar")
    }
    if (conSsl && env.DB_SSL_VERIFICAR === "false") {
        if (produccion) {
            errores.push("DB_SSL_VERIFICAR=false no se permite en producción: sin comprobar el certificado, alguien podría hacerse pasar por la base de datos. Si el proveedor usa una autoridad propia, indica su certificado en DB_SSL_CA")
        } else {
            advertencias.push("DB_SSL_VERIFICAR=false: la conexión va cifrada pero no se comprueba el certificado del servidor (solo para pruebas)")
        }
    }
    const ca = String(env.DB_SSL_CA ?? "").trim()
    if (ca !== "" && !ca.startsWith("-----BEGIN") && !existeArchivo(ca)) {
        errores.push(`DB_SSL_CA indica un archivo que no existe: ${ca}`)
    }

    // Clave para cifrar los secretos del 2FA. Perderla o cambiarla invalida el 2FA de todos los usuarios.
    try {
        leerClave(env.TOTP_CLAVE_CIFRADO)
    } catch (error) {
        errores.push(error.message)
    }

    const origen = String(env.APP_ORIGEN ?? "").trim().replace(/\/+$/, "")
    if (origen === "") {
        if (produccion) {
            errores.push("Falta APP_ORIGEN: la dirección pública de la aplicación (ejemplo: https://gestorrh.onrender.com)")
        }
    } else {
        const problema = problemaDeOrigen(origen, produccion)
        if (problema) {
            errores.push(problema)
        }
    }

    if (env.TRUST_PROXY !== undefined && env.TRUST_PROXY !== "") {
        const saltos = Number(env.TRUST_PROXY)
        if (!Number.isInteger(saltos) || saltos < 1 || saltos > 5) {
            errores.push("TRUST_PROXY debe ser el número de proxies delante del servidor (normalmente 1)")
        }
    } else if (produccion) {
        advertencias.push("TRUST_PROXY no está definida: detrás de un proxy (Render, Railway, Nginx) el servidor verá la misma IP para todos y el límite de intentos por IP afectará a todos por igual. Usa TRUST_PROXY=1")
    }

    if (!produccion) {
        advertencias.push("NODE_ENV no es production: úsalo en la nube")
    }

    return { errores, advertencias }
}

module.exports = { validarConfiguracion, origenDeLaApp }
