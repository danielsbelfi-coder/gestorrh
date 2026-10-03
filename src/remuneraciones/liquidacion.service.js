const { Liquidacion, PeriodoRemuneracion, ContratoTrabajo, Asistencia, Trabajador, TramoImpuesto } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { obtenerParametroVigente } = require("./parametro_legal.service.js")
const { obtenerPeriodoPorId } = require("./periodo_remuneracion.service.js")
const { NotFoundError, ConflictError } = require("../shared/errors.js")


function calcularHorasExtrasTrabajadas(horaEntrada, horaSalida) {
    const [horaE, minE] = horaEntrada.split(":")
    const [horaS, minS] = horaSalida.split(":")

    const minutosEntrada = Number(horaE) * 60 + Number(minE)
    const minutosSalida = Number(horaS) * 60 + Number(minS)

    return (minutosSalida - minutosEntrada) / 60
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

    const diasPeriodo = 30
    const primerDia = `${mesVigente.anio}-${String(mesVigente.mes).padStart(2, "0")}-01`
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

    const valorHoraOrdinaria = (contrato.sueldo_base / 30 * 28) / (contrato.horas_semanales * 4)
    const valorHoraExtra = valorHoraOrdinaria * (1 + parametroRecargo.valor / 100)
    const montoHorasExtra = horasExtratotal * valorHoraExtra



    const parametroAfp = await obtenerParametroVigente("TASA_AFP_MODELO", primerDia)
    if (parametroAfp === null) {
        throw new ConflictError("No Existe un parámetro de AFP para la fecha del periodo")
    }

    const parametroSalud = await obtenerParametroVigente("TASA_SALUD_MINIMA", primerDia)
    if (parametroSalud === null) {
        throw new ConflictError("No Existe un parámetro de salud vigente para la fecha del periodo")
    }

    const sueldoBaseProporcional = contrato.sueldo_base * diasTrabajados / diasPeriodo

    const parametroIMM = await obtenerParametroVigente("INGRESO_MINIMO_MENSUAL", primerDia)
    if (parametroIMM === null) {
        throw new ConflictError("No existe un parámetro de Ingreso Minimo Mensual vigente para la fecha del periodo")
    }

    const topeMensual = (4.75 * parametroIMM.valor) / 12

    const gratificacionCalculada = sueldoBaseProporcional * 0.25

    const montoGratificacion = Math.min(gratificacionCalculada, topeMensual)


    const totalHaberes = sueldoBaseProporcional + montoHorasExtra + montoGratificacion

    const descuentoAFP = sueldoBaseProporcional * (parametroAfp.valor / 100)

    const descuentoSalud = sueldoBaseProporcional * (parametroSalud.valor / 100)

    const baseTributable = (sueldoBaseProporcional + montoHorasExtra + montoGratificacion) - (descuentoAFP + descuentoSalud)

    const valorUTM = await obtenerParametroVigente("UTM", primerDia)
    if (valorUTM === null) {
        throw new ConflictError("No existe un parámetro de impuesto unico vigente para la fecha del periodo")
    }

    const baseEnUTM = baseTributable / valorUTM.valor

    const tramo = await TramoImpuesto.findOne({
        where: {
            desde_utm: { [Op.lte]: baseEnUTM },
            [Op.or]: [
                { hasta_utm: null },
                { hasta_utm: { [Op.gte]: baseEnUTM } }
            ]
        }
    })

    if (tramo === null) {
        throw new ConflictError("No existe un tramo de impuesto unico vigente para la fecha del periodo")
    }

    const montoImpuestoUnico = Math.max(0, (baseTributable * tramo.tasa / 100) - (tramo.rebaja_utm * valorUTM.valor))

    const totalDescuentos = descuentoAFP + descuentoSalud

    const liquidoAPagar = totalHaberes - totalDescuentos - montoImpuestoUnico

    const snapshotContrato = {
        sueldo_base: contrato.sueldo_base,
        tipo_contrato: contrato.tipo_contrato,
        cargo_id: contrato.cargo_id,
        sistema_remuneracion: contrato.sistema_remuneracion,
        periodicidad_pago: contrato.periodicidad_pago
    }

    const detalleCalculo = {
        afp: { codigo: "TASA_AFP_MODELO", valor: parametroAfp.valor, monto: descuentoAFP },
        salud: { codigo: "TASA_SALUD_MINIMA", valor: parametroSalud.valor, monto: descuentoSalud },
        horasExtra: { codigo: "RECARGO_HORA_EXTRA", valor: parametroRecargo.valor, monto: montoHorasExtra },
        gratificacion: { codigo: "INGRESO_MINIMO_MENSUAL", topeMensual: topeMensual, monto: montoGratificacion },
        impuestoUnico: { baseEnUTM: baseEnUTM, tasa: tramo.tasa, rebajaUtm: tramo.rebaja_utm, monto: montoImpuestoUnico }
    }

    const fechaCalculo = new Date().toISOString().split("T")[0]

    return await Liquidacion.create({
        periodo_id: periodo_id,
        trabajador_id: trabajador_id,
        snapshot_contrato: snapshotContrato,
        dias_trabajados: diasTrabajados,
        dias_periodo: diasPeriodo,
        sueldo_base_proporcional: sueldoBaseProporcional,
        horas_extra: horasExtratotal,
        valor_hora_extra: valorHoraExtra,
        monto_horas_extra: montoHorasExtra,
        monto_gratificacion: montoGratificacion,
        total_haberes: totalHaberes,
        descuento_afp: descuentoAFP,
        descuento_salud: descuentoSalud,
        monto_impuesto_unico: montoImpuestoUnico,
        total_descuentos: totalDescuentos,
        liquido_a_pagar: liquidoAPagar,
        detalle_calculo: detalleCalculo,
        fecha_calculo: fechaCalculo
    })
}

async function listarLiquidaciones(empresasPermitidas) {
    return await Liquidacion.findAll({
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