const { COMUNAS } = require("../shared/comunas_lre.js")
const { esFechaValida } = require("../shared/fechas.js")

const ALCANCES = ["nacional", "regional", "comunal"]

function regionDeComuna(codigo) {
    return COMUNAS[codigo]?.region ?? null
}

// Valida y normaliza los datos de un feriado. Devuelve { datos, errores }.
// nacional: sin región ni comuna. regional: región 1 a 16. comunal: comuna de la tabla de la DT.
function validarFeriado(entrada) {
    const errores = []
    const datos = {
        fecha: entrada?.fecha,
        nombre: typeof entrada?.nombre === "string" ? entrada.nombre.trim() : "",
        alcance: entrada?.alcance,
        region: entrada?.region ?? null,
        comuna: entrada?.comuna ?? null,
        irrenunciable: entrada?.irrenunciable === true
    }

    if (!esFechaValida(datos.fecha)) {
        errores.push("La fecha debe ser válida (AAAA-MM-DD)")
    }
    if (datos.nombre.length < 3 || datos.nombre.length > 100) {
        errores.push("El nombre debe tener entre 3 y 100 caracteres")
    }
    if (!ALCANCES.includes(datos.alcance)) {
        errores.push("El alcance debe ser nacional, regional o comunal")
        return { datos, errores }
    }

    if (datos.alcance === "nacional") {
        datos.region = null
        datos.comuna = null
    }

    if (datos.alcance === "regional") {
        datos.region = Number(datos.region)
        datos.comuna = null
        if (!Number.isInteger(datos.region) || datos.region < 1 || datos.region > 16) {
            errores.push("Indica la región (1 a 16)")
        }
    }

    if (datos.alcance === "comunal") {
        datos.region = null
        datos.comuna = datos.comuna === null ? null : String(datos.comuna)
        if (datos.comuna === null || COMUNAS[datos.comuna] === undefined) {
            errores.push("Indica una comuna de la tabla de la Dirección del Trabajo")
        }
    }

    return { datos, errores }
}

// Feriados que rigen para un lugar: los nacionales, los de su región y los de su comuna.
// Sin comuna (null) solo se consideran los nacionales.
function feriadosAplicables(feriados, comuna) {
    const region = comuna ? regionDeComuna(comuna) : null

    return feriados.filter((f) =>
        f.alcance === "nacional"
        || (f.alcance === "regional" && region !== null && Number(f.region) === region)
        || (f.alcance === "comunal" && comuna && f.comuna === String(comuna)))
}

// ¿Esa fecha es feriado en ese lugar? Devuelve el feriado o null.
function feriadoDelDia(feriados, fecha, comuna) {
    return feriadosAplicables(feriados, comuna).find((f) => String(f.fecha).slice(0, 10) === fecha) ?? null
}

module.exports = { ALCANCES, regionDeComuna, validarFeriado, feriadosAplicables, feriadoDelDia }
