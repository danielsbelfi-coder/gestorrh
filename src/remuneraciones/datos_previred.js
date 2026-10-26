const { tramoAsignacionFamiliar } = require("./archivo_previred.js")
const { movimientosDelMes } = require("./movimientos_previred.js")

function montoLinea(lineas, codigo) {
    return lineas
        .filter((linea) => linea.codigo === codigo)
        .reduce((suma, linea) => suma + Number(linea.monto), 0)
}

function datosPrevired({ liquidacion, anio, mes, limitesTramo, codigoMutual, tipoJornada, fechasInasistencia, fechasPermisoSinGoce }) {
    const trabajador = liquidacion.Trabajador
    const persona = trabajador.Persona
    const detalle = liquidacion.detalle_calculo
    const monto = (codigo) => montoLinea(liquidacion.LiquidacionLineas, codigo)
    const renta = detalle.cotizaciones.baseCotizaciones
    const licencias = detalle.licencias ?? []

    return {
        trabajador: {
            rut: persona.rut,
            dv: persona.dv,
            apellidoPaterno: persona.apellido_paterno,
            apellidoMaterno: persona.apellido_materno,
            nombres: persona.nombres,
            sexo: persona.sexo_genero,
            nacionalidad: persona.nacionalidad,
            anio,
            mes,
            diasTrabajados: liquidacion.dias_trabajados,
            tramo: tramoAsignacionFamiliar(detalle.cotizaciones.rentaImponible, limitesTramo)
        },
        prevision: {
            codigoAfp: persona.Afp.codigo_previred,
            rentaImponible: renta,
            afp: monto("AFP"),
            cuentaIndividual: monto("APORTE_CUENTA_INDIVIDUAL"),
            sis: monto("APORTE_SIS"),
            salud: {
                sistema: detalle.salud.sistema,
                codigoIsapre: persona.Isapre?.codigo_previred ?? null,
                planUF: detalle.salud.planUF,
                legal: monto("SALUD"),
                adicional: monto("SALUD_ADICIONAL_ISAPRE")
            }
        },
        empleador: {
            rentaImponible: renta,
            rima: detalle.aportes?.rimaMes ?? 0,
            tipoJornada,
            expectativaVida: monto("APORTE_EXPECTATIVA_VIDA"),
            rentabilidadProtegida: monto("APORTE_RENTABILIDAD_PROTEGIDA"),
            mutual: { codigo: codigoMutual, monto: monto("APORTE_MUTUAL") + monto("APORTE_SANNA") },
            cesantia: { base: detalle.cesantia.base, trabajador: monto("CESANTIA"), empleador: monto("APORTE_CESANTIA") },
            pagador: licencias.length > 0 ? { rut: licencias[0].pagador_rut, dv: licencias[0].pagador_dv } : null
        },
        movimientos: movimientosDelMes({
            anio,
            mes,
            fechaIngreso: trabajador.fecha_ingreso,
            fechaTermino: trabajador.fecha_termino,
            tipoContrato: liquidacion.snapshot_contrato.tipo_contrato,
            licencias,
            fechasInasistencia,
            fechasPermisoSinGoce
        })
    }
}

module.exports = { 
    datosPrevired
 }