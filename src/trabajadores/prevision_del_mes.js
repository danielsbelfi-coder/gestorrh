// Reglas puras del historial de previsión (AFP y salud) por mes. Sin base de datos, para poder probarlas.

// Fecha que representa la previsión «desde siempre» (la que la persona tenía antes de que existiera el historial).
const DESDE_SIEMPRE = "1900-01-01"

const primerDia = (anio, mes) => `${anio}-${String(mes).padStart(2, "0")}-01`

// La previsión que rige en un mes: la fila con el mayor "desde" que no pasa el primer día del mes. null si no hay.
function previsionDelMes(filas, anio, mes) {
    const limite = primerDia(anio, mes)
    let elegida = null
    for (const fila of filas ?? []) {
        const desde = String(fila.desde).slice(0, 10)
        if (desde <= limite && (elegida === null || desde > String(elegida.desde).slice(0, 10))) {
            elegida = fila
        }
    }
    return elegida
}

// "AAAA-MM" → "AAAA-MM-01"; "siempre" → DESDE_SIEMPRE; cualquier otra cosa → null.
function desdeDeTexto(texto) {
    if (texto === "siempre") {
        return DESDE_SIEMPRE
    }
    return typeof texto === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(texto) ? `${texto}-01` : null
}

// Revisa los datos de un cambio (sin consultar si la AFP o la isapre existen). Devuelve la lista de errores.
function validarPrevision(datos) {
    const errores = []
    if (desdeDeTexto(datos?.desde) === null) {
        errores.push("El mes desde el que rige debe tener el formato AAAA-MM")
    }
    // Sin AFP (null o vacío) solo corresponde al técnico extranjero (Ley 18.156); el cálculo lo exige en los demás.
    const sinAfp = datos?.afp_id === null || datos?.afp_id === undefined || datos?.afp_id === ""
    if (!sinAfp && (!Number.isInteger(Number(datos.afp_id)) || Number(datos.afp_id) <= 0)) {
        errores.push("La AFP indicada no es válida")
    }
    if (datos?.sistema_salud !== "Fonasa" && datos?.sistema_salud !== "Isapre") {
        errores.push("El sistema de salud debe ser Fonasa o Isapre")
    }
    if (datos?.sistema_salud === "Isapre") {
        if (!Number.isInteger(Number(datos.isapre_id)) || Number(datos.isapre_id) <= 0) {
            errores.push("Debe indicar la isapre")
        }
        const plan = Number(String(datos.plan_isapre_uf ?? "").replace(",", "."))
        if (!Number.isFinite(plan) || plan <= 0 || plan >= 10000) {
            errores.push("El plan de isapre debe ser un número mayor que 0 (en UF)")
        }
    }
    return errores
}

// Los datos ya revisados, como se guardan: Fonasa no lleva isapre ni plan.
function normalizarPrevision(datos) {
    const isapre = datos.sistema_salud === "Isapre"
    return {
        desde: desdeDeTexto(datos.desde),
        afp_id: datos.afp_id === null || datos.afp_id === undefined || datos.afp_id === "" ? null : Number(datos.afp_id),
        sistema_salud: datos.sistema_salud,
        isapre_id: isapre ? Number(datos.isapre_id) : null,
        plan_isapre_uf: isapre ? Number(String(datos.plan_isapre_uf).replace(",", ".")) : null
    }
}

// Meses "AAAA-MM" de las liquidaciones de periodos cerrados que un cambio desde "desde" alcanzaría.
function mesesCerradosAlcanzados(desde, liquidacionesCerradas) {
    const desdeMes = String(desde).slice(0, 7)
    return [...new Set(liquidacionesCerradas
        .map(({ anio, mes }) => `${anio}-${String(mes).padStart(2, "0")}`)
        .filter((mes) => mes >= desdeMes))].sort()
}

module.exports = { DESDE_SIEMPRE, previsionDelMes, desdeDeTexto, validarPrevision, normalizarPrevision, mesesCerradosAlcanzados }
