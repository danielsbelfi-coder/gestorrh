const { Liquidacion, PeriodoRemuneracion, ContratoTrabajo, Asistencia, Trabajador, TramoImpuesto, Persona, Afp } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { obtenerParametroVigente } = require("./parametro_legal.service.js")
const { obtenerPeriodoPorId } = require("./periodo_remuneracion.service.js")
const { NotFoundError, ConflictError } = require("../shared/errors.js")
const { calcularLiquidacion } = require("./liquidacion.calculator.js")
const { obtenerContratoPorId } = require("../contratos/contrato.service.js")
const FECHA_VIGENCIA_SEGURO_CESANTIA = "2002-10-01"
const ANIOS_MAXIMO_COTIZACION_CESANTIA = 11

function calcularHorasExtrasTrabajadas(horaEntrada, horaSalida) {
    const [horaE, minE] = horaEntrada.split(":")
    const [horaS, minS] = horaSalida.split(":")

    const minutosEntrada = Number(horaE) * 60 + Number(minE)
    const minutosSalida = Number(horaS) * 60 + Number(minS)

    return (minutosSalida - minutosEntrada) / 60
}

function trabajadorCotizaCesantia(contrato, trabajador, primerDia){
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

async function crearLiquidacion(periodo_id, trabajador_id, empresasPermitidas) {
    const mesVigente = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    if (mesVigente.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones se encuentra cerrado")
    }

    const liquidacionesEmitidas = await Liquidacion.findOne({
        where: {
            trabajador_id: trabajador_id,
            periodo_id: periodo_id
        }
    })

    if (liquidacionesEmitidas !== null) {
        throw new ConflictError("ya existe una liquidación para este trabajador en este periodo")
    }

    const contrato = await ContratoTrabajo.findOne({
        where: {
            trabajador_id: trabajador_id,
            estado: "vigente"
        }
    })
    if (contrato === null) {
        throw new ConflictError("No existe un contrato vigente para este trabajador")
    }

    const buscarTrabajador = await Trabajador.findByPk(trabajador_id, {
        include: [
            {
                model: Persona,
                include: [{ model: Afp }]
            }
        ]
    })

    if (buscarTrabajador === null) {
        throw new NotFoundError("Trabajador no encontrado")
    }
    if (buscarTrabajador.Persona.Afp === null){
        throw new ConflictError("El trabajador no tiene una AFP asignada")
    }
    if (buscarTrabajador.Persona.Afp.comision === null) {
        throw new ConflictError("la AFP del trabajador no tiene comisión registrada")
    }

    const diasPeriodo = 30
    const primerDia = `${mesVigente.anio}-${String(mesVigente.mes).padStart(2, "0")}-01`

    const tramos = await TramoImpuesto.findAll({
        where: {
            vigencia_desde: { [Op.lte]: primerDia },
            [Op.or]: [
                { vigencia_hasta: null },
                { vigencia_hasta: { [Op.gte]: primerDia } }
            ]
        },
        order: [["desde_utm", "ASC"]]
    }
    )

    const tramosParaCalculo = tramos.map(function (t) {
        return {
            desdeUTM: Number(t.desde_utm),
            hastaUTM: t.hasta_utm === null ? null : Number(t.hasta_utm),
            tasa: Number(t.tasa),
            rebajaUTM: Number(t.rebaja_utm)
        }
    })


    const ultimoDiaNum = new Date(mesVigente.anio, mesVigente.mes, 0).getDate()
    const ultimoDia = `${mesVigente.anio}-${String(mesVigente.mes).padStart(2, "0")}-${String(ultimoDiaNum).padStart(2, "0")}`

    const asistenciasDelPeriodo = await Asistencia.findAll({
        where: {
            trabajador_id: trabajador_id,
            fecha: { [Op.gte]: primerDia, [Op.lte]: ultimoDia },
            tipo: { [Op.ne]: "inasistencia" }
        }
    })

    const diasNoPagados = await Asistencia.count({
        where: {
            trabajador_id: trabajador_id,
            fecha: { [Op.gte]: primerDia, [Op.lte]: ultimoDia },
            tipo: { [Op.in]: ["inasistencia", "permiso", "licencia_medica"] }
        }
    })

    const diasTrabajados = Math.max(0, diasPeriodo - diasNoPagados)

    let horasExtratotal = 0

    const horasOrdinariasDiarias = contrato.horas_semanales / 5



    asistenciasDelPeriodo.forEach((asistencia) => {
        if (asistencia.hora_entrada === null || asistencia.hora_salida === null) {
            return
        }

        const calculo = calcularHorasExtrasTrabajadas(asistencia.hora_entrada, asistencia.hora_salida)

        if (calculo > horasOrdinariasDiarias) {
            horasExtratotal += (calculo - horasOrdinariasDiarias)
        }
    })

    const parametroRecargo = await obtenerParametroVigente("RECARGO_HORA_EXTRA", primerDia)
    if (parametroRecargo === null) {
        throw new ConflictError("No existe un parámetro de recargo de hora extra vigente para la fecha del periodo")
    }

    const parametroUF = await obtenerParametroVigente("UF", primerDia)
    if (parametroUF === null) {
        throw new ConflictError("No existe un parámetro de UF vigente para la fecha del periodo")
    }


    const parametroTopeImponible = await obtenerParametroVigente("TOPE_IMPONIBLE_UF", primerDia)
    if (parametroTopeImponible === null) {
        throw new ConflictError("No existe un parámetro tope imponible vigente para la fecha del periodo")
    }

    const parametroCotizacionAfp = await obtenerParametroVigente("COTIZACION_OBLIGATORIA_AFP", primerDia)
    if (parametroCotizacionAfp === null) {
        throw new ConflictError("No Existe un parámetro de la AFP del trabajador para la fecha del periodo")
    }

    const parametroSalud = await obtenerParametroVigente("TASA_SALUD_MINIMA", primerDia)
    if (parametroSalud === null) {
        throw new ConflictError("No Existe un parámetro de salud vigente para la fecha del periodo")
    }

    const parametroTasaCesantia = await obtenerParametroVigente("TASA_CESANTIA_TRABAJADOR", primerDia)
    if (parametroTasaCesantia === null) {
        throw new ConflictError("No Existe un parámetro de tasa seguro de cesantía vigente para la fecha del periodo ")
    }
    const parametroTopeCesantia = await obtenerParametroVigente("TOPE_CESANTIA_UF", primerDia)
    if (parametroTopeCesantia === null) {
        throw new ConflictError("No Existe un parámetro de tope seguro de cesantía vigente para la fecha del periodo ")
    }

    const parametroIMM = await obtenerParametroVigente("INGRESO_MINIMO_MENSUAL", primerDia)
    if (parametroIMM === null) {
        throw new ConflictError("No existe un parámetro de Ingreso Minimo Mensual vigente para la fecha del periodo")
    }

    const valorUTM = await obtenerParametroVigente("UTM", primerDia)
    if (valorUTM === null) {
        throw new ConflictError("No existe un parámetro de impuesto unico vigente para la fecha del periodo")
    }

    const datos = {
        sueldoBase: Number(contrato.sueldo_base),
        horasSemanales: Number(contrato.horas_semanales),
        diasTrabajados: diasTrabajados,
        diasPeriodo: diasPeriodo,
        horasExtra: horasExtratotal,
        recargoHoraExtra: Number(parametroRecargo.valor),
        ingresoMinimoMensual: Number(parametroIMM.valor),
        tasaAfp: Number(parametroCotizacionAfp.valor) + Number(buscarTrabajador.Persona.Afp.comision),
        tasaSalud: Number(parametroSalud.valor),
        topeImponibleUF: Number(parametroTopeImponible.valor),
        valorUF: Number(parametroUF.valor),
        valorUTM: Number(valorUTM.valor),
        topeCesantiaUF: Number(parametroTopeCesantia.valor),
        tasaCesantia: trabajadorCotizaCesantia(contrato, buscarTrabajador, primerDia) ? Number(parametroTasaCesantia.valor) : 0,
        tramos: tramosParaCalculo
    }

    let resultado
    try {
        resultado = calcularLiquidacion(datos)
    } catch (error) {
        throw new ConflictError(error.message)
    }

    const snapshotContrato = {
        sueldo_base: contrato.sueldo_base,
        tipo_contrato: contrato.tipo_contrato,
        cargo_id: contrato.cargo_id,
        sistema_remuneracion: contrato.sistema_remuneracion,
        periodicidad_pago: contrato.periodicidad_pago
    }

    const detalleCalculo = {
        afp: { codigo: buscarTrabajador.Persona.Afp.codigo, cotizacionObligatoria: Number(parametroCotizacionAfp.valor), comision: Number(buscarTrabajador.Persona.Afp.comision), tasaTotal: datos.tasaAfp, monto: resultado.descuentoAFP },
        salud: { codigo: "TASA_SALUD_MINIMA", valor: parametroSalud.valor, monto: resultado.descuentoSalud },
        horasExtra: { codigo: "RECARGO_HORA_EXTRA", valor: parametroRecargo.valor, monto: resultado.montoHorasExtra },
        gratificacion: { codigo: "INGRESO_MINIMO_MENSUAL", topeMensual: resultado.topeMensual, monto: resultado.montoGratificacion },
        impuestoUnico: { baseEnUTM: resultado.baseEnUTM, tasa: resultado.tramo.tasa, rebajaUtm: resultado.tramo.rebajaUTM, monto: resultado.montoImpuestoUnico },
        cotizaciones: { parametrotopeImponible: parametroTopeImponible.valor, valorUF: parametroUF.valor, topeImponible: resultado.topeImponible, baseCotizaciones: resultado.baseCotizaciones },
        cesantia: {cotiza: datos.tasaCesantia > 0, tasa: datos.tasaCesantia, topeUF: Number(parametroTopeCesantia.valor), topeCesantia: resultado.topeCesantia, baseCesantia: resultado.baseCesantia, monto: resultado.descuentoCesantia}
    }

    const fechaCalculo = new Date().toISOString().split("T")[0]

    return await Liquidacion.create({
        periodo_id: periodo_id,
        trabajador_id: trabajador_id,
        snapshot_contrato: snapshotContrato,
        dias_trabajados: diasTrabajados,
        dias_periodo: diasPeriodo,
        sueldo_base_proporcional: resultado.sueldoBaseProporcional,
        horas_extra: horasExtratotal,
        valor_hora_extra: resultado.valorHoraExtra,
        monto_horas_extra: resultado.montoHorasExtra,
        monto_gratificacion: resultado.montoGratificacion,
        total_haberes: resultado.totalHaberes,
        descuento_afp: resultado.descuentoAFP,
        descuento_salud: resultado.descuentoSalud,
        descuento_cesantia: resultado.descuentoCesantia,
        monto_impuesto_unico: resultado.montoImpuestoUnico,
        total_descuentos: resultado.totalDescuentos,
        liquido_a_pagar: resultado.liquidoAPagar,
        detalle_calculo: detalleCalculo,
        fecha_calculo: fechaCalculo
    })
}

async function listarLiquidaciones(periodo_id, empresasPermitidas) {
    return await Liquidacion.findAll({
        where: { periodo_id: periodo_id },
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
    obtenerLiquidacionPorId
}