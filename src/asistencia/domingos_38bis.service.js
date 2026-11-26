// Siete domingos adicionales al año del art. 38 bis (paquete AF). Solo trabajadores del N° 7 del art. 38 sin las
// excepciones legales (contrato de 30 días o menos, jornada de 20 h semanales o menos, contratado solo para sábados,
// domingos o festivos).
// - Anualidad: cada año de vigencia desde la fecha de ingreso (regla general) o el año calendario, si se acordó.
// - Cuentan los domingos de descanso que pasan de dos en cada mes calendario (los dos del art. 38 inc. 4° son aparte) y
//   hasta 3 sábados libres (acuerdo escrito, cada uno junto a un domingo de descanso).
// - No se compensan en dinero ni se acumulan; al término sin completar la anualidad, los no otorgados se pagan en el
//   finiquito (Ord. DT 806/14): criterio de Daniel, 7 menos los ya dados, a un día de sueldo cada uno.
const { libroDelTrabajador } = require("./libro_asistencia.service.js")
const { reglasDomingo } = require("./domingos_art38.js")

const DOMINGOS_38BIS = 7
const SABADOS_MAXIMO = 3

const sumarDias = (fecha, dias) => {
    const d = new Date(`${fecha}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dias)
    return d.toISOString().slice(0, 10)
}
const sumarAnios = (fecha, anios) => {
    const [a, m, d] = fecha.split("-").map(Number)
    const resultado = new Date(Date.UTC(a + anios, m - 1, d))
    // 29 de febrero en un año no bisiesto: 28 de febrero.
    if (resultado.getUTCMonth() !== m - 1) {
        resultado.setUTCDate(0)
    }
    return resultado.toISOString().slice(0, 10)
}

function aplica(contrato) {
    const reglas = reglasDomingo(contrato)
    return reglas.n7 && reglas.dosDomingos
}

// Anualidad que contiene una fecha: { desde, hasta }.
function anualidadDe(fechaIngreso, contrato, fecha) {
    const ingreso = String(fechaIngreso).slice(0, 10)
    if (contrato.domingos_38bis_anio === "calendario") {
        const anio = fecha.slice(0, 4)
        const desde = `${anio}-01-01`
        return { desde: desde < ingreso ? ingreso : desde, hasta: `${anio}-12-31` }
    }
    let k = Number(fecha.slice(0, 4)) - Number(ingreso.slice(0, 4))
    while (k > 0 && sumarAnios(ingreso, k) > fecha) {
        k--
    }
    const desde = sumarAnios(ingreso, Math.max(0, k))
    return { desde, hasta: sumarDias(sumarAnios(ingreso, Math.max(0, k) + 1), -1) }
}

function mesesEntre(desde, hasta) {
    const meses = []
    let [anio, mes] = [Number(desde.slice(0, 4)), Number(desde.slice(5, 7))]
    while (`${anio}-${String(mes).padStart(2, "0")}` <= hasta.slice(0, 7)) {
        meses.push([anio, mes])
        mes === 12 ? (anio++, mes = 1) : mes++
    }
    return meses
}

// Avance de la anualidad que contiene «fecha», contado hasta esa fecha.
async function progreso38bis(trabajador, contrato, fecha, transaction) {
    const anualidad = anualidadDe(trabajador.fecha_ingreso, contrato, fecha)
    const hasta = fecha < anualidad.hasta ? fecha : anualidad.hasta
    const dentro = (f) => f >= anualidad.desde && f <= hasta
    let domingos = 0
    let sabados = 0
    for (const [anio, mes] of mesesEntre(anualidad.desde, hasta)) {
        const libro = await libroDelTrabajador(trabajador, anio, mes, transaction, { conSemanas: false })
        // Los dos primeros domingos de descanso de cada mes son los del art. 38 inc. 4°; los demás, del 38 bis.
        const deDescanso = libro.dias.filter((d) => d.domingoDeDescanso).map((d) => d.fecha).sort()
        domingos += deDescanso.slice(2).filter(dentro).length
        sabados += libro.dias.filter((d) => d.esperado.sabado38bis && dentro(d.fecha)).length
    }
    const otorgados = Math.min(DOMINGOS_38BIS, domingos + Math.min(SABADOS_MAXIMO, sabados))
    return { ...anualidad, contadoHasta: hasta, domingos, sabados, otorgados, pendientes: DOMINGOS_38BIS - otorgados }
}

// Avisos del libro del mes: la anualidad terminó en el mes sin completarse, o quedan 2 meses o menos y faltan domingos.
function avisos38bis(progreso, ultimoDiaDelMes) {
    const fecha = (f) => f.split("-").reverse().join("-")
    if (progreso.pendientes === 0) {
        return []
    }
    if (progreso.hasta <= ultimoDiaDelMes) {
        return [`Art. 38 bis: la anualidad del ${fecha(progreso.desde)} al ${fecha(progreso.hasta)} terminó con ${progreso.otorgados} de 7 domingos adicionales. No se pagan ni pasan al año siguiente`]
    }
    const restantes = Math.round((Date.parse(`${progreso.hasta}T00:00:00Z`) - Date.parse(`${ultimoDiaDelMes}T00:00:00Z`)) / 86400000)
    return restantes <= 61
        ? [`Art. 38 bis: faltan ${progreso.pendientes} de 7 domingos adicionales y la anualidad termina el ${fecha(progreso.hasta)}`]
        : []
}

module.exports = { DOMINGOS_38BIS, SABADOS_MAXIMO, aplica, anualidadDe, progreso38bis, avisos38bis }
