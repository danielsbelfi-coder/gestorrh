const { Liquidacion, PeriodoRemuneracion, ContratoTrabajo, Trabajador, TramoImpuesto,
    Persona, Afp, ConceptoRemuneracion,
    ResumenAsistencia, VariablePeriodo, LiquidacionLinea, Empresa } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { obtenerParametroVigente } = require("./parametro_legal.service.js")
const { obtenerPeriodoPorId } = require("./periodo_remuneracion.service.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { sequelize } = require("../shared/database.js")
const { calcularDiasPago, DIAS_MES_COMERCIAL } = require("./dias_pago.js")
const { calcularLiquidacionPorLineas } = require("./calculo_lineas.js")
const { calcularAportesEmpleador } = require("./aportes_empleador.js")

const FECHA_VIGENCIA_SEGURO_CESANTIA = "2002-10-01"
const ANIOS_MAXIMO_COTIZACION_CESANTIA = 11

function trabajadorCotizaCesantia(contrato, trabajador, primerDia) {
    const tipoContrato = contrato.tipo_contrato
    const fechaIngreso = trabajador.fecha_ingreso
    const anioIngreso = Number(trabajador.fecha_ingreso.slice(0, 4))
    const anioLimite = anioIngreso + ANIOS_MAXIMO_COTIZACION_CESANTIA
    const mesYDia = trabajador.fecha_ingreso.slice(4)
    const fechaLimite = `${anioLimite}${mesYDia}`

    if (tipoContrato === "indefinido" && fechaIngreso > FECHA_VIGENCIA_SEGURO_CESANTIA && primerDia < fechaLimite) {
        return true
    }

    return false
}

function tasaCesantiaEmpleador(contrato, trabajador, parametros) {
    if (contrato.tipo_contrato !== "indefinido") {
        return parametros.cesantiaEmpleadorPlazoFijo
    }

    return trabajador.fecha_ingreso > FECHA_VIGENCIA_SEGURO_CESANTIA ? parametros.cesantiaEmpleadorIndefinido : 0
}

const CODIGOS_SISTEMA = [
    "SUELDO_BASE", "GRATIFICACION", "DESCUENTO_ATRASOS", "AFP", "SALUD",
    "SALUD_ADICIONAL_ISAPRE", "CESANTIA", "IMPUESTO_UNICO",
    "DESCUENTO_PAGO_EXCESO", "AJUSTE_PAGO_EXCESO",
    "APORTE_CESANTIA", "APORTE_MUTUAL", "APORTE_SANNA",
    "APORTE_SEGURO_SOCIAL", "APORTE_CUENTA_INDIVIDUAL", "APORTE_RENTABILIDAD_PROTEGIDA"
]

async function obtenerConceptosSistema() {
    const conceptos = await ConceptoRemuneracion.findAll({
        where: { empresa_id: null, codigo: CODIGOS_SISTEMA }
    })

    const porCodigo = Object.fromEntries(conceptos.map((concepto) => [concepto.codigo, concepto]))
    const faltantes = CODIGOS_SISTEMA.filter((codigo) => !porCodigo[codigo])

    if (faltantes.length > 0) {
        throw new ConflictError(`Faltan conceptos del sistema en el catálogo: ${faltantes.join(", ")}`)
    }

    return porCodigo
}

async function obtenerResumenAprobado(periodoId, trabajadorId) {
    const resumen = await ResumenAsistencia.findOne({
        where: { periodo_id: periodoId, trabajador_id: trabajadorId }
    })

    if (resumen === null || resumen.estado !== "aprobado") {
        throw new ConflictError("El resumen de asistencia del trabajador no está aprobado")
    }

    return resumen
}

async function obtenerVariablesDelMes(periodoId, trabajadorId) {
    const variables = await VariablePeriodo.findAll({
        where: { periodo_id: periodoId, trabajador_id: trabajadorId },
        include: [ConceptoRemuneracion]
    })

    const aprobadas = variables
        .filter((variable) => variable.estado === "aprobada")
        .map((variable) => ({
            concepto: variable.ConceptoRemuneracion,
            cantidad: variable.cantidad,
            monto: variable.monto
        }))

    return { aprobadas, pendientes: variables.length - aprobadas.length }
}

async function obtenerSaldoAnterior(periodo, trabajadorId) {
    const mesAnterior = periodo.mes === 1 ? 12 : periodo.mes - 1
    const anioAnterior = periodo.mes === 1 ? periodo.anio - 1 : periodo.anio

    const periodoAnterior = await PeriodoRemuneracion.findOne({
        where: { empresa_id: periodo.empresa_id, mes: mesAnterior, anio: anioAnterior }
    })

    if (periodoAnterior === null) {
        return 0
    }

    const liquidacionAnterior = await Liquidacion.findOne({
        where: { periodo_id: periodoAnterior.id, trabajador_id: trabajadorId, vigente: true }
    })

    return liquidacionAnterior === null ? 0 : liquidacionAnterior.saldo_pago_exceso
}

const CODIGOS_PARAMETROS = {
    valorUF: "UF",
    valorUTM: "UTM",
    topeImponibleUF: "TOPE_IMPONIBLE_UF",
    cotizacionAfp: "COTIZACION_OBLIGATORIA_AFP",
    tasaSalud: "TASA_SALUD_MINIMA",
    tasaCesantia: "TASA_CESANTIA_TRABAJADOR",
    topeCesantiaUF: "TOPE_CESANTIA_UF",
    ingresoMinimoMensual: "INGRESO_MINIMO_MENSUAL",
    mutualBasica: "MUTUAL_TASA_BASICA",
    sanna: "LEY_SANNA",
    cesantiaEmpleadorIndefinido: "CESANTIA_EMPLEADOR_INDEFINIDO",
    cesantiaEmpleadorPlazoFijo: "CESANTIA_EMPLEADOR_PLAZO_FIJO",
    seguroSocial: "SEGURO_SOCIAL_PREVISIONAL",
    cuentaIndividual: "REFORMA_CUENTA_INDIVIDUAL",
    rentabilidadProtegida: "REFORMA_RENTABILIDAD_PROTEGIDA"
}

async function obtenerParametrosDelMes(fecha) {
    const parametros = {}

    for (const [nombre, codigo] of Object.entries(CODIGOS_PARAMETROS)) {
        const parametro = await obtenerParametroVigente(codigo, fecha)

        if (parametro === null) {
            throw new ConflictError(`No existe un parámetro ${codigo} vigente para la fecha del periodo`)
        }

        parametros[nombre] = Number(parametro.valor)
    }

    return parametros
}

async function obtenerTramos(fecha) {
    const tramos = await TramoImpuesto.findAll({
        where: {
            vigencia_desde: { [Op.lte]: fecha },
            [Op.or]: [{ vigencia_hasta: null }, { vigencia_hasta: { [Op.gte]: fecha } }]
        },
        order: [["desde_utm", "ASC"]]
    })

    return tramos.map((t) => ({
        desdeUTM: Number(t.desde_utm),
        hastaUTM: t.hasta_utm === null ? null : Number(t.hasta_utm),
        tasa: Number(t.tasa),
        rebajaUTM: Number(t.rebaja_utm)
    }))
}

function filasLineas(lineasOrdenadas, liquidacionId) {
    return lineasOrdenadas.map((linea, indice) => ({
        liquidacion_id: liquidacionId,
        concepto_id: linea.concepto.id,
        codigo: linea.concepto.codigo,
        nombre: linea.concepto.nombre,
        tipo: linea.concepto.tipo,
        imponible: linea.concepto.imponible,
        tributable: linea.concepto.tributable,
        base_gratificacion: linea.concepto.base_gratificacion,
        cantidad: linea.cantidad,
        monto: linea.monto,
        orden: indice + 1
    }))
}

function advertenciasDe(pendientes) {
    return pendientes > 0
        ? [`Hay ${pendientes} variable(s) pendiente(s) de aprobación que no se consideraron en el cálculo`]
        : []
}

async function obtenerTrabajadorDelPeriodo(periodo, trabajadorId) {
    const trabajador = await Trabajador.findByPk(trabajadorId, {
        include: [{ model: Persona, include: [{ model: Afp }] }]
    })

    if (trabajador === null || trabajador.empresa_id !== periodo.empresa_id) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    return trabajador
}

async function prepararCalculo(periodo, trabajador) {
    const contrato = await ContratoTrabajo.findOne({
        where: { trabajador_id: trabajador.id, estado: "vigente" }
    })

    if (contrato === null) {
        throw new ConflictError("No existe un contrato vigente para este trabajador")
    }

    const persona = trabajador.Persona

    if (persona.Afp === null) {
        throw new ConflictError("El trabajador no tiene una AFP asignada")
    }
    if (persona.Afp.comision === null) {
        throw new ConflictError("La AFP del trabajador no tiene comisión registrada")
    }
    if (persona.sistema_salud === null) {
        throw new ConflictError("El trabajador no tiene un sistema de salud asignado")
    }
    if (persona.sistema_salud === "Isapre" && persona.plan_isapre_uf === null) {
        throw new ConflictError("El trabajador no tiene un valor de plan de isapre")
    }

    const resumen = await obtenerResumenAprobado(periodo.id, trabajador.id)
    const { aprobadas, pendientes } = await obtenerVariablesDelMes(periodo.id, trabajador.id)
    const conceptos = await obtenerConceptosSistema()
    const saldoPendiente = await obtenerSaldoAnterior(periodo, trabajador.id)

    const { diasNoContratado, diasPagados } = calcularDiasPago({
        anio: periodo.anio,
        mes: periodo.mes,
        fechaIngreso: trabajador.fecha_ingreso,
        fechaTermino: trabajador.fecha_termino,
        resumen
    })

    const primerDia = `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}-01`
    const parametros = await obtenerParametrosDelMes(primerDia)
    const tramos = await obtenerTramos(primerDia)

    const empresa = await Empresa.findByPk(periodo.empresa_id)

    const tasasAportes = {
        cesantia: tasaCesantiaEmpleador(contrato, trabajador, parametros),
        mutual: parametros.mutualBasica + Number(empresa.tasa_adicional_mutual),
        sanna: parametros.sanna,
        seguroSocial: parametros.seguroSocial,
        cuentaIndividual: parametros.cuentaIndividual,
        rentabilidadProtegida: parametros.rentabilidadProtegida
    }

    const datos = {
        sueldoBase: Number(contrato.sueldo_base),
        horasSemanales: Number(contrato.horas_semanales),
        diasPagados,
        variables: aprobadas,
        minutosAtraso: resumen.minutos_atraso,
        ingresoMinimoMensual: parametros.ingresoMinimoMensual,
        tasaAfp: parametros.cotizacionAfp + Number(persona.Afp.comision),
        tasaSalud: parametros.tasaSalud,
        planSaludUF: persona.sistema_salud === "Isapre" ? Number(persona.plan_isapre_uf) : 0,
        topeImponibleUF: parametros.topeImponibleUF,
        valorUF: parametros.valorUF,
        valorUTM: parametros.valorUTM,
        tasaCesantia: trabajadorCotizaCesantia(contrato, trabajador, primerDia) ? parametros.tasaCesantia : 0,
        topeCesantiaUF: parametros.topeCesantiaUF,
        tramos,
        saldoPendiente,
        conceptos
    }

    let resultado
    try {
        resultado = calcularLiquidacionPorLineas(datos)
    } catch (error) {
        throw new ConflictError(error.message)
    }

    const { aportes, totalAportes } = calcularAportesEmpleador({
        baseCotizaciones: resultado.baseCotizaciones,
        baseCesantia: resultado.baseCesantia,
        tasas: tasasAportes,
        conceptos
    })

    const montoDe = (codigo) => resultado.lineas
        .filter((l) => l.concepto.codigo === codigo)
        .reduce((suma, l) => suma + l.monto, 0)

    const lineasHoras = resultado.lineas.filter((l) => l.concepto.recargo_hora_extra !== null)

    const lineasOrdenadas = [
        ...resultado.lineas.filter((l) => l.concepto.tipo === "haber"),
        ...resultado.lineas.filter((l) => l.concepto.tipo === "descuento"),
        ...aportes
    ]

    const detalleCalculo = {
        diasPago: {
            diasPagados,
            diasNoContratado,
            inasistencia: resumen.dias_inasistencia,
            licenciaMedica: resumen.dias_licencia_medica,
            permisoSinGoce: resumen.dias_permiso_sin_goce,
            vacaciones: resumen.dias_vacaciones,
            minutosAtraso: resumen.minutos_atraso
        },
        valorHoraOrdinaria: Math.round(resultado.valorHora * 100) / 100,
        gratificacion: { base: resultado.baseGratificacion, tope: resultado.topeGratificacion },
        cotizaciones: { rentaImponible: resultado.rentaImponible, topeImponible: resultado.topeImponible, baseCotizaciones: resultado.baseCotizaciones },
        afp: { codigo: persona.Afp.codigo, tasa: datos.tasaAfp },
        salud: { sistema: persona.sistema_salud, planUF: datos.planSaludUF, legal: resultado.descuentoSaludLegal, adicionalIsapre: resultado.descuentoAdicionalIsapre },
        cesantia: { tasa: datos.tasaCesantia, base: resultado.baseCesantia, tope: resultado.topeCesantia },
        impuesto: { baseTributable: resultado.baseTributable, baseEnUTM: resultado.baseEnUTM, tasa: resultado.tramo.tasa, rebajaUTM: resultado.tramo.rebajaUTM },
        saldoAnterior: saldoPendiente,
        variablesPendientes: pendientes,
        aportes: { tasas: tasasAportes, total: totalAportes }
    }

    const campos = {
        snapshot_contrato: {
            sueldo_base: contrato.sueldo_base,
            horas_semanales: contrato.horas_semanales,
            tipo_contrato: contrato.tipo_contrato,
            cargo_id: contrato.cargo_id,
            sistema_remuneracion: contrato.sistema_remuneracion,
            periodicidad_pago: contrato.periodicidad_pago
        },
        dias_trabajados: diasPagados,
        dias_periodo: DIAS_MES_COMERCIAL,
        sueldo_base_proporcional: montoDe("SUELDO_BASE"),
        horas_extra: lineasHoras.reduce((suma, l) => suma + l.cantidad, 0),
        valor_hora_extra: Math.round(resultado.valorHora * 1.5),
        monto_horas_extra: lineasHoras.reduce((suma, l) => suma + l.monto, 0),
        monto_gratificacion: montoDe("GRATIFICACION"),
        total_haberes: resultado.totalHaberes,
        descuento_afp: montoDe("AFP"),
        descuento_salud: montoDe("SALUD") + montoDe("SALUD_ADICIONAL_ISAPRE"),
        descuento_cesantia: montoDe("CESANTIA"),
        monto_impuesto_unico: montoDe("IMPUESTO_UNICO"),
        total_descuentos: resultado.totalDescuentos,
        liquido_a_pagar: resultado.liquidoAPagar,
        total_aportes_empleador: totalAportes,
        saldo_pago_exceso: resultado.nuevoSaldoPendiente,
        detalle_calculo: detalleCalculo,
        fecha_calculo: new Date().toISOString().slice(0, 10)
    }

    return { campos, lineasOrdenadas, pendientes }
}

async function crearLiquidacion(periodo_id, trabajador_id, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.CALCULAR_LIQUIDACION)

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones se encuentra cerrado")
    }

    const trabajador = await obtenerTrabajadorDelPeriodo(periodo, trabajador_id)

    const vigente = await Liquidacion.findOne({
        where: { periodo_id: periodo.id, trabajador_id: trabajador.id, vigente: true }
    })

    if (vigente !== null && vigente.estado !== "calculada") {
        throw new ConflictError("La liquidación ya fue emitida; para modificarla use el recálculo")
    }

    const { campos, lineasOrdenadas, pendientes } = await prepararCalculo(periodo, trabajador)

    const liquidacion = await sequelize.transaction(async (transaction) => {
        if (vigente !== null) {
            await vigente.update(campos, { transaction })
            await LiquidacionLinea.destroy({ where: { liquidacion_id: vigente.id }, transaction })
            await LiquidacionLinea.bulkCreate(filasLineas(lineasOrdenadas, vigente.id), { transaction })
            return vigente
        }

        const nueva = await Liquidacion.create({
            periodo_id: periodo.id,
            trabajador_id: trabajador.id,
            ...campos,
            version: 1,
            vigente: true
        }, { transaction })

        await LiquidacionLinea.bulkCreate(filasLineas(lineasOrdenadas, nueva.id), { transaction })

        return nueva
    })

    return { liquidacion, advertencias: advertenciasDe(pendientes), reemplazada: vigente !== null }
}

async function recalcularLiquidacion(periodo_id, liquidacion_id, motivo, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.CALCULAR_LIQUIDACION)

    const anterior = await Liquidacion.findOne({
        where: { id: liquidacion_id, periodo_id: periodo.id }
    })

    if (anterior === null) {
        throw new NotFoundError("Liquidación no encontrada")
    }

    if (typeof motivo !== "string" || motivo.trim() === "") {
        throw new ValidationError("Debe indicar el motivo del recálculo")
    }

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones se encuentra cerrado")
    }
    if (!anterior.vigente) {
        throw new ConflictError("Solo se puede recalcular la versión vigente de la liquidación")
    }
    if (anterior.estado === "calculada") {
        throw new ConflictError("La liquidación está en borrador; recalcúlela desde el cálculo normal")
    }

    const trabajador = await obtenerTrabajadorDelPeriodo(periodo, anterior.trabajador_id)

    const { campos, lineasOrdenadas, pendientes } = await prepararCalculo(periodo, trabajador)

    const liquidacion = await sequelize.transaction(async (transaction) => {
        await anterior.update({ vigente: false }, { transaction })

        const nueva = await Liquidacion.create({
            periodo_id: periodo.id,
            trabajador_id: trabajador.id,
            ...campos,
            version: anterior.version + 1,
            vigente: true,
            reemplaza_a_id: anterior.id,
            motivo_version: motivo.trim()
        }, { transaction })

        await LiquidacionLinea.bulkCreate(filasLineas(lineasOrdenadas, nueva.id), { transaction })

        return nueva
    })

    return { liquidacion, advertencias: advertenciasDe(pendientes) }
}

async function listarLiquidaciones(periodo_id, empresasPermitidas) {
    return await Liquidacion.findAll({
        where: { periodo_id: periodo_id, vigente: true },
        include: [{
            model: PeriodoRemuneracion,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
            }, required: true
        }]
    })
}

async function obtenerLiquidacionPorId(id, empresasPermitidas) {
    const liquidacion = await Liquidacion.findByPk(id, {
        include: [{
            model: PeriodoRemuneracion,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
            },
            required: true
        }]
    },
    )

    if (liquidacion === null) {
        throw new NotFoundError("Liquidación no encontrada")
    }

    return liquidacion
}


module.exports = {
    crearLiquidacion,
    listarLiquidaciones,
    obtenerLiquidacionPorId,
    recalcularLiquidacion
}