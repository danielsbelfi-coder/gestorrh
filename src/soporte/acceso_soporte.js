// Reglas puras del acceso de soporte (sin base de datos), para poder probarlas.

const HORAS_PERMITIDAS = [1, 4, 8, 24]
const HORAS_POR_DEFECTO = 4
const MOTIVO_MINIMO = 10
const MOTIVO_MAXIMO = 500

// Rutas de la plataforma: soporte las usa sin autorización del cliente y no se registran.
const PREFIJOS_PLATAFORMA = ["/api/auth", "/api/parametros-legales", "/api/feriados", "/api/afps", "/api/isapres", "/api/mutualidades", "/api/soporte"]

function rutaDePlataforma(url) {
    const ruta = String(url ?? "").split("?")[0]
    return PREFIJOS_PLATAFORMA.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`))
}

function textoMotivo(motivo) {
    return typeof motivo === "string" ? motivo.trim() : ""
}

// Devuelve la lista de errores (vacía si es válido). Si no se indica "horas", se usa el valor por defecto.
function validarMotivo(motivo) {
    const texto = textoMotivo(motivo)
    if (texto.length < MOTIVO_MINIMO || texto.length > MOTIVO_MAXIMO) {
        return [`El motivo debe tener entre ${MOTIVO_MINIMO} y ${MOTIVO_MAXIMO} caracteres`]
    }
    return []
}

function validarAutorizacion({ horas, motivo } = {}) {
    const errores = []
    const horasFinal = horas === undefined || horas === null ? HORAS_POR_DEFECTO : Number(horas)

    if (!HORAS_PERMITIDAS.includes(horasFinal)) {
        errores.push(`La duración debe ser de ${HORAS_PERMITIDAS.join(", ")} horas`)
    }

    errores.push(...validarMotivo(motivo))
    return errores
}

function estaVigente(acceso, ahora = new Date()) {
    if (!acceso || acceso.revocado_en) {
        return false
    }
    const instante = ahora.getTime()
    return new Date(acceso.desde).getTime() <= instante && new Date(acceso.hasta).getTime() > instante
}

function estadoDeAcceso(acceso, ahora = new Date()) {
    if (acceso.revocado_en) {
        return "revocado"
    }
    return estaVigente(acceso, ahora) ? "vigente" : "vencido"
}

// "****1234". Sin número o con menos de 5 dígitos no se muestra nada del número.
function enmascararCuenta(numero) {
    if (typeof numero !== "string" && typeof numero !== "number") {
        return numero === undefined ? undefined : "****"
    }
    const texto = String(numero).trim()
    return texto.length > 4 ? `****${texto.slice(-4)}` : "****"
}

// Copia la respuesta ocultando todo "numero_cuenta" (en cualquier nivel).
function enmascararCuentas(valor) {
    if (Array.isArray(valor)) {
        return valor.map(enmascararCuentas)
    }
    if (valor !== null && typeof valor === "object") {
        if (valor instanceof Date) {
            return valor
        }
        const origen = typeof valor.toJSON === "function" ? valor.toJSON() : valor
        const copia = {}
        for (const [clave, contenido] of Object.entries(origen)) {
            copia[clave] = clave === "numero_cuenta" && contenido !== null && contenido !== undefined
                ? enmascararCuenta(contenido)
                : enmascararCuentas(contenido)
        }
        return copia
    }
    return valor
}

module.exports = {
    HORAS_PERMITIDAS,
    HORAS_POR_DEFECTO,
    MOTIVO_MINIMO,
    MOTIVO_MAXIMO,
    rutaDePlataforma,
    validarAutorizacion,
    validarMotivo,
    textoMotivo,
    estaVigente,
    estadoDeAcceso,
    enmascararCuenta,
    enmascararCuentas
}
