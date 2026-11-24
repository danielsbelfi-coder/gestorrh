// Saldo de tiempo compensatorio (art. 25, paquete AC). Cálculo puro sobre movimientos { fecha "AAAA-MM-DD", minutos }.
//
// Criterio de Daniel (24-11-2026): las esperas que se compensan con descanso generan tiempo compensatorio 1:1 (un minuto
// de espera, después de los minutos sin pago y el redondeo de su tipo, vale un minuto de descanso); el descanso se da
// de preferencia por horas; el saldo no vence y pasa de un mes a otro; lo que queda sin usar al término de la relación
// se paga en la última liquidación, al valor hora de esa liquidación.
// - Ganado: turnos aprobados y sin errores (su fecha es la del turno).
// - Usado: descansos aprobados.

function sumar(movimientos, condicion) {
    return movimientos.filter(condicion).reduce((suma, m) => suma + Number(m.minutos), 0)
}

function diaAnterior(fecha) {
    const d = new Date(`${fecha}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
}

// Saldo al cierre de una fecha (incluida).
function saldoAl({ ganados, usados, fecha }) {
    return sumar(ganados, (m) => m.fecha <= fecha) - sumar(usados, (m) => m.fecha <= fecha)
}

// Saldo inicial, ganado, usado y saldo final entre dos fechas (incluidas).
function resumenEntre({ ganados, usados, desde, hasta }) {
    const saldoInicial = saldoAl({ ganados, usados, fecha: diaAnterior(desde) })
    const ganado = sumar(ganados, (m) => m.fecha >= desde && m.fecha <= hasta)
    const usado = sumar(usados, (m) => m.fecha >= desde && m.fecha <= hasta)
    return { saldoInicial, ganado, usado, saldoFinal: saldoInicial + ganado - usado }
}

// Minutos que se pueden dar como descanso en una fecha: lo ganado hasta esa fecha menos todo lo ya otorgado o por
// otorgar (aprobado o pendiente, en cualquier fecha), para que el saldo nunca quede negativo.
function disponibleEn({ ganados, comprometidos, fecha }) {
    return sumar(ganados, (m) => m.fecha <= fecha) - sumar(comprometidos, () => true)
}

module.exports = { saldoAl, resumenEntre, disponibleEn }
