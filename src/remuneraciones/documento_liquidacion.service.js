const { Liquidacion, LiquidacionLinea, PeriodoRemuneracion, Empresa, Trabajador,
    Persona, Afp, Isapre, Cargo } = require("../shared/associations.js")
const { obtenerPeriodoPorId } = require("./periodo_remuneracion.service.js")
const { NotFoundError } = require("../shared/errors.js")
const { armarDocumento } = require("./armar_documento.js")
const { fechaPagoDelPeriodo } = require("./fecha_pago.service.js")
const { aplicarPrevisionGuardada } = require("./prevision_liquidacion.js")


async function obtenerLiquidacionCompleta(liquidacionId) {
    const liquidacion = await Liquidacion.findByPk(liquidacionId, {
        include: [
            { model: PeriodoRemuneracion, include: [Empresa] },
            { model: Trabajador, include: [{ model: Persona, include: [Afp, Isapre] }] },
            { model: LiquidacionLinea }
        ],
        order: [[LiquidacionLinea, "orden", "ASC"]]
    })

    await aplicarPrevisionGuardada(liquidacion)
    const cargo = await Cargo.findByPk(liquidacion.snapshot_contrato.cargo_id)

    return { liquidacion, cargo }
}

// La fecha de pago es la guardada al calcular; las liquidaciones de antes de existir la regla usan la regla actual.
async function prepararDocumento(liquidacionId) {
    const { liquidacion, cargo } = await obtenerLiquidacionCompleta(liquidacionId)
    const periodo = liquidacion.PeriodoRemuneracion
    const fechaPago = liquidacion.detalle_calculo?.fechaPago !== undefined
        ? liquidacion.detalle_calculo.fechaPago
        : await fechaPagoDelPeriodo(periodo.Empresa, periodo.anio, periodo.mes)
    return armarDocumento(liquidacion.toJSON(), cargo, { fechaPago })
}

async function documentoLiquidacion(periodo_id, liquidacion_id, empresasPermitidas) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    const liquidacion = await Liquidacion.findOne({
        where: { id: liquidacion_id, periodo_id: periodo.id }
    })

    if (liquidacion === null) {
        throw new NotFoundError("Liquidación no encontrada")
    }

    return { periodo, documentos: [await prepararDocumento(liquidacion.id)] }
}

async function documentosPeriodo(periodo_id, empresasPermitidas) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    const vigentes = await Liquidacion.findAll({
        where: { periodo_id: periodo.id, vigente: true },
        order: [["trabajador_id", "ASC"]]
    })

    if (vigentes.length === 0) {
        throw new NotFoundError("No hay liquidaciones en este periodo")
    }

    const documentos = []
    for (const liquidacion of vigentes) {
        documentos.push(await prepararDocumento(liquidacion.id))
    }

    return { periodo, documentos }
}

module.exports = {
    obtenerLiquidacionCompleta,
    documentoLiquidacion,
    documentosPeriodo
}