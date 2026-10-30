const { tramoAsignacionFamiliar } = require("./archivo_previred.js")
const { movimientosDelMes } = require("./movimientos_previred.js")
const { CODIGO_PREVIRED, DESCUENTOS_CCAF, problemasDescuentosCcaf } = require("./ccaf.js")

function montoLinea(lineas, codigo) {
    return lineas
        .filter((linea) => linea.codigo === codigo)
        .reduce((suma, linea) => suma + Number(linea.monto), 0)
}

// Tramo y cargas guardados en la liquidación (sin tramo registrado → D, sin derecho). Las liquidaciones calculadas
// antes de existir las cargas no los tienen: siguen con el tramo según la renta y sin cargas.
function asignacionFamiliarPrevired(detalle, limitesTramo) {
    const guardada = detalle.asignacionFamiliar
    if (!guardada) {
        return { tramo: tramoAsignacionFamiliar(detalle.cotizaciones.rentaImponible, limitesTramo), cargasSimples: 0, cargasMaternales: 0, cargasInvalidez: 0 }
    }
    return { tramo: guardada.tramo ?? "D", cargasSimples: guardada.simples, cargasMaternales: guardada.maternales, cargasInvalidez: guardada.invalidez }
}

// APVI (con el depósito convenido en su bloque) y APVC guardados en la liquidación. null si no hay.
function ahorroPrevired(apv) {
    const apvi = apv?.apvi ?? null
    const dc = apv?.depositoConvenido ?? null
    const bloqueApvi = apvi ?? dc
    return {
        apvi: bloqueApvi === null ? null : {
            institucionCodigo: bloqueApvi.institucionCodigo,
            numeroContrato: bloqueApvi.numeroContrato,
            formaPago: bloqueApvi.formaPago,
            monto: apvi?.monto ?? 0,
            depositoConvenido: dc?.monto ?? 0
        },
        apvc: apv?.apvc ? {
            institucionCodigo: apv.apvc.institucionCodigo,
            numeroContrato: apv.apvc.numeroContrato,
            formaPago: apv.apvc.formaPago,
            trabajador: apv.apvc.trabajador,
            empleador: apv.apvc.empleador
        } : null
    }
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
            tipoCotizante: detalle.cotizante.tipo,
            ...asignacionFamiliarPrevired(detalle, limitesTramo),
            asignacion: monto("ASIGNACION_FAMILIAR"),
            asignacionRetroactiva: monto("ASIGNACION_FAMILIAR_RETROACTIVA"),
            reintegroCargas: monto("REINTEGRO_CARGAS_FAMILIARES")
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
        ahorro: ahorroPrevired(detalle.apv),
        ccaf: {
            codigo: detalle.ccaf?.caja ? CODIGO_PREVIRED[detalle.ccaf.caja] : null,
            rentaImponible: renta,
            saludCcaf: detalle.ccaf?.saludCcaf ?? 0,
            descuentos: Object.fromEntries(Object.entries(DESCUENTOS_CCAF).map(([codigo, regla]) => [regla.campo, monto(codigo)])),
            // Lo pagado por asignación familiar, que el empleador recupera de la caja (91) o del IPS (73).
            asignacionFamiliar: monto("ASIGNACION_FAMILIAR") + monto("ASIGNACION_FAMILIAR_RETROACTIVA") + monto("REINTEGRO_CARGAS_FAMILIARES")
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

function problemasPrevired({ liquidacion, primerDia, fechasInasistencia, fechasPermisoSinGoce }) {
    const persona = liquidacion.Trabajador.Persona
    const detalle = liquidacion.detalle_calculo
    const problemas = []

    if (liquidacion.estado === "calculada") {
        problemas.push("La liquidación está en borrador; emítala antes de generar el archivo")
    }
    if (detalle?.cotizante === undefined) {
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

    const montoDe = (codigo) => montoLinea(liquidacion.LiquidacionLineas ?? [], codigo)
    problemas.push(...problemasDescuentosCcaf(detalle.ccaf?.caja ?? null,
        Object.fromEntries(Object.keys(DESCUENTOS_CCAF).map((codigo) => [codigo, montoDe(codigo)]))))
    const { apvi, depositoConvenido } = detalle.apv ?? {}
    if (apvi && depositoConvenido && apvi.institucionCodigo !== depositoConvenido.institucionCodigo) {
        problemas.push("El depósito convenido va en el bloque del APV individual de Previred: debe ser de la misma institución que el APVI")
    }

    if (detalle.diasPago.inasistencia !== fechasInasistencia.length) {
        problemas.push(`El resumen tiene ${detalle.diasPago.inasistencia} día(s) de inasistencia, pero hay ${fechasInasistencia.length} marca(s) aprobada(s) con fecha`)
    }
    if (detalle.diasPago.permisoSinGoce !== fechasPermisoSinGoce.length) {
        problemas.push(`El resumen tiene ${detalle.diasPago.permisoSinGoce} día(s) de permiso sin goce, pero hay ${fechasPermisoSinGoce.length} marca(s) aprobada(s) con fecha`)
    }

    return problemas
}

module.exports = {
    asignacionFamiliarPrevired,
    datosPrevired,
    problemasPrevired
}