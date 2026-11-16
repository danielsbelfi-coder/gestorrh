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


function edadAl(fechaNacimiento, fecha) {
    const anios = Number(fecha.slice(0, 4)) - Number(fechaNacimiento.slice(0, 4))
    return fecha.slice(5) < fechaNacimiento.slice(5) ? anios - 1 : anios
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

// Lleva un valor de fecha a "aaaa-mm-dd". Acepta el texto de una fecha ("aaaa-mm-dd" o con hora) y un Date
// (por ejemplo `createdAt` o un `new Date()` recién guardado, que Sequelize deja como Date en memoria); un Date se
// pasa a la fecha de Chile, no a la UTC, para que de noche no salga el día siguiente.
function fechaISO(valor) {
    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(valor)
    }
    return String(valor ?? "").slice(0, 10)
}

function fechaEnTexto(valor) {
    const fecha = fechaISO(valor)
    return `${Number(fecha.slice(8, 10))} de ${MESES[Number(fecha.slice(5, 7)) - 1]} de ${fecha.slice(0, 4)}`
}

module.exports = {
    fechaISO,
    esFechaValida,
    sumarDias,
    fechaChilena,
    diasEntre,
    tramosContinuos,
    edadAl,
    fechaEnTexto
}