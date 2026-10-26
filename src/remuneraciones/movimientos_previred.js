const { tramosContinuos } = require("../shared/fechas.js")
const { estaEnElMes } = require("./dias_pago.js")

const CODIGO_LICENCIA = { comun: 3, maternal: 3, accidente_trabajo: 6 }

function movimientosDelMes({ anio, mes, fechaIngreso, fechaTermino, tipoContrato, licencias, fechasInasistencia, fechasPermisoSinGoce }) {
    const primerDia = `${anio}-${String(mes).padStart(2, "0")}-01`
    const movimientos = []

    if (estaEnElMes(fechaIngreso, anio, mes)) {
        movimientos.push({ codigo: tipoContrato === "indefinido" ? 1 : 7, desde: fechaIngreso, hasta: null })
    }
    if (estaEnElMes(fechaTermino, anio, mes)) {
        movimientos.push({ codigo: 2, desde: null, hasta: fechaTermino })
    }

    for (const licencia of licencias) {
        movimientos.push({
            codigo: CODIGO_LICENCIA[licencia.tipo],
            desde: licencia.fecha_inicio > primerDia ? licencia.fecha_inicio : primerDia,
            hasta: licencia.fecha_termino
        })
    }

    for (const tramo of tramosContinuos(fechasInasistencia)) {
        movimientos.push({ codigo: 11, ...tramo })
    }
    for (const tramo of tramosContinuos(fechasPermisoSinGoce)) {
        movimientos.push({ codigo: 4, ...tramo })
    }

    movimientos.sort((a, b) => (a.desde ?? a.hasta).localeCompare(b.desde ?? b.hasta))

    return movimientos.length > 0 ? movimientos : [{ codigo: 0, desde: null, hasta: null }]
}

module.exports = { movimientosDelMes }