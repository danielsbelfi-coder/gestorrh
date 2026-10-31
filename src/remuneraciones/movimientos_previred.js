const { tramosContinuos } = require("../shared/fechas.js")
const { estaEnElMes } = require("./dias_pago.js")

const CODIGO_LICENCIA = { comun: 3, maternal: 3, accidente_trabajo: 6 }

// fechaConversion: vigencia del anexo firmado que pasó el contrato a indefinido (código 8), si es de este mes.
function movimientosDelMes({ anio, mes, fechaIngreso, fechaTermino, tipoContrato, fechaConversion = null, licencias, fechasInasistencia, fechasPermisoSinGoce }) {
    const primerDia = `${anio}-${String(mes).padStart(2, "0")}-01`
    const movimientos = []
    const conversion = estaEnElMes(fechaConversion, anio, mes)

    if (estaEnElMes(fechaIngreso, anio, mes)) {
        // Si en el mismo mes pasó a indefinido, el ingreso fue con el contrato original (plazo fijo u obra o faena).
        movimientos.push({ codigo: tipoContrato === "indefinido" && !conversion ? 1 : 7, desde: fechaIngreso, hasta: null })
    }
    if (conversion) {
        movimientos.push({ codigo: 8, desde: fechaConversion, hasta: null })
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