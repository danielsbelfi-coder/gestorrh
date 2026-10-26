function esFechaValida(texto) {
    if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return false
    }

    const fecha = new Date(`${texto}T00:00:00Z`)

    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto
}

function sumarDias(texto, dias) {
    const fecha = new Date(`${texto}T00:00:00Z`)
    fecha.setUTCDate(fecha.getUTCDate() + dias)
    return fecha.toISOString().slice(0, 10)
}

function fechaChilena(texto) {
    if (!texto) {
        return ""
    }
    const [anio, mes, dia] = String(texto).slice(0, 10).split("-")
    return `${dia}-${mes}-${anio}`
}

function diasEntre(desde, hasta) {
    const inicio = Date.parse(`${desde}T00:00:00Z`)
    const fin = Date.parse(`${hasta}T00:00:00Z`)
    return Math.round((fin - inicio) / 86400000) + 1
}

function tramosContinuos(fechas) {
    const ordenadas = [...new Set(fechas)].sort()
    const tramos = []

    for (const fecha of ordenadas) {
        const ultimo = tramos[tramos.length - 1]

        if (ultimo && sumarDias(ultimo.hasta, 1) === fecha) {
            ultimo.hasta = fecha
        } else {
            tramos.push({ desde: fecha, hasta: fecha })
        }
    }

    return tramos
}

module.exports = {
    esFechaValida,
    sumarDias,
    fechaChilena,
    diasEntre,
    tramosContinuos
}