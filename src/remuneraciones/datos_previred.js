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

const EDAD_LIMITE = { masculino: 65, femenino: 60 }

function edadAl(fechaNacimiento, fecha) {
    const anios = Number(fecha.slice(0, 4)) - Number(fechaNacimiento.slice(0, 4))
    return fecha.slice(5) < fechaNacimiento.slice(5) ? anios - 1 : anios
}

function problemasPrevired({ liquidacion, primerDia, fechasInasistencia, fechasPermisoSinGoce }) {
    const persona = liquidacion.Trabajador.Persona
    const detalle = liquidacion.detalle_calculo
    const problemas = []

    if (liquidacion.estado === "calculada") {
        problemas.push("La liquidación está en borrador; emítala antes de generar el archivo")
    }
    if (detalle?.aportes?.baseSeguroSocial === undefined) {
        problemas.push("La liquidación se calculó con un formato anterior; recalcúlela")
        return problemas
    }
    if (persona.sexo_genero === null) {
        problemas.push("La persona no tiene sexo registrado")
    }
    if (!persona.Afp?.codigo_previred) {
        problemas.push("La AFP de la persona no tiene código Previred")
    }
    if (detalle.salud.sistema === "Isapre" && !persona.Isapre?.codigo_previred) {
        problemas.push("La isapre de la persona no tiene código Previred")
    }
    if (detalle.diasPago.inasistencia !== fechasInasistencia.length) {
        problemas.push(`El resumen tiene ${detalle.diasPago.inasistencia} día(s) de inasistencia, pero hay ${fechasInasistencia.length} marca(s) aprobada(s) con fecha`)
    }
    if (detalle.diasPago.permisoSinGoce !== fechasPermisoSinGoce.length) {
        problemas.push(`El resumen tiene ${detalle.diasPago.permisoSinGoce} día(s) de permiso sin goce, pero hay ${fechasPermisoSinGoce.length} marca(s) aprobada(s) con fecha`)
    }

    const limite = EDAD_LIMITE[persona.sexo_genero]
    const edad = edadAl(persona.fecha_nacimiento, primerDia)
    if (limite !== undefined && edad >= limite) {
        problemas.push(`Tiene ${edad} años: puede corresponder a un tipo de cotizante (3 u 8) que todavía no se informa`)
    }

    return problemas
}

module.exports = {
    datosPrevired,
    problemasPrevired
}