// Valor de la hora para horas extra y atrasos con sueldo mensual (funciones puras). Ver «Valor hora: día y mes de origen»
// en el SPEC.
//
// Fórmula (factor DT para sueldo mensual): sueldo / 30 × 28 / (horas semanales × 4).
// - Con un anexo de sueldo en el mes, cada hora extra y cada minuto de atraso del libro se valorizan con el sueldo
//   vigente ese día. Como la variable de horas extra del libro trae el total del mes, se usa el valor hora ponderado por
//   los minutos de cada día.
// - Las horas pendientes de un mes cerrado (variable con mes de origen) se valorizan con el sueldo y la jornada del
//   contrato vigentes al cierre del mes de origen, aunque se paguen después.

const { sueldoDelDia } = require("./semana_corrida.js")

function valorHoraOrdinaria(sueldoBase, horasSemanales) {
    return (Number(sueldoBase) / 30 * 28) / (Number(horasSemanales) * 4)
}

// Valor hora de cada tramo de sueldo del mes: [{ desdeDia, valorHora }].
function valoresHoraPorTramo(tramos, horasSemanales) {
    return tramos.map((tramo) => ({ desdeDia: Number(tramo.desdeDia ?? 1), valorHora: valorHoraOrdinaria(tramo.sueldo, horasSemanales) }))
}

function valorHoraDelDia(porTramo, fecha) {
    return sueldoDelDia(porTramo.map((t) => ({ desdeDia: t.desdeDia, sueldo: t.valorHora })), fecha)
}

function ponderado(items) {
    const minutos = items.reduce((s, i) => s + i.minutos, 0)
    return minutos > 0 ? items.reduce((s, i) => s + i.minutos * i.valorHora, 0) / minutos : null
}

// Valor hora ponderado de las horas extra (por recargo) y de los atrasos aprobados del libro del mes.
// dias: filas de calcularLibro ({ fecha, cuenta, minutosExtra, recargo, minutosDescuento }).
function valoresHoraDelLibro(dias, porTramo) {
    const aprobados = dias.filter((d) => d.cuenta === true)
    const conValor = (d, minutos) => ({ minutos, valorHora: valorHoraDelDia(porTramo, d.fecha) })
    return {
        50: ponderado(aprobados.filter((d) => d.minutosExtra > 0 && d.recargo === 50).map((d) => conValor(d, d.minutosExtra))),
        100: ponderado(aprobados.filter((d) => d.minutosExtra > 0 && d.recargo === 100).map((d) => conValor(d, d.minutosExtra))),
        atraso: ponderado(aprobados.filter((d) => d.minutosDescuento > 0).map((d) => conValor(d, d.minutosDescuento)))
    }
}

module.exports = { valorHoraOrdinaria, valoresHoraPorTramo, valorHoraDelDia, valoresHoraDelLibro }
