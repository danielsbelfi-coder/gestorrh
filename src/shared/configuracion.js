// Revisa la configuración (variables de entorno) antes de arrancar el servidor.
// Devuelve { errores, advertencias }: con errores el servidor no parte.

const CLAVES_DEBILES = ["secret", "secreto", "changeme", "cambiar", "password", "contraseña", "jwt_secret", "mi_clave_secreta", "clave_secreta"]
const REQUERIDAS_BD = ["DB_NAME", "DB_USER", "DB_HOST", "DB_DIALECT"]
const MAXIMO_RECOMENDADO_HORAS = 24

function aHoras(duracion) {
    const texto = String(duracion).trim()
    if (/^\d+$/.test(texto)) {
        return Number(texto) / 3600
    }
    const coincidencia = /^(\d+)\s*([smhd])$/.exec(texto)
    if (!coincidencia) {
        return null
    }
    const factor = { s: 1 / 3600, m: 1 / 60, h: 1, d: 24 }[coincidencia[2]]
    return Number(coincidencia[1]) * factor
}

function validarConfiguracion(env) {
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

    const secreto = env.JWT_SECRET ?? ""
    if (secreto === "") {
        errores.push("Falta JWT_SECRET")
    } else if (secreto.length < 32) {
        errores.push("JWT_SECRET es demasiado corta: usa al menos 32 caracteres aleatorios")
    } else if (CLAVES_DEBILES.some((debil) => secreto.toLowerCase().includes(debil))) {
        errores.push("JWT_SECRET parece una clave de ejemplo: genera una aleatoria (node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\")")
    }

    // Sin vencimiento, un token robado serviría para siempre.
    if (!env.JWT_EXPIRES_IN) {
        errores.push("Falta JWT_EXPIRES_IN (por ejemplo 8h): sin ella los tokens no vencen nunca")
    } else {
        const horas = aHoras(env.JWT_EXPIRES_IN)
        if (horas === null || horas <= 0) {
            errores.push("JWT_EXPIRES_IN no es válida: usa un formato como 30m, 8h o 1d")
        } else if (horas > MAXIMO_RECOMENDADO_HORAS) {
            advertencias.push(`JWT_EXPIRES_IN dura más de ${MAXIMO_RECOMENDADO_HORAS} horas: se recomienda 8h`)
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

module.exports = { validarConfiguracion, aHoras }
