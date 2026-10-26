const { Liquidacion, LiquidacionLinea, PeriodoRemuneracion, Empresa, Trabajador,
    Persona, Afp, Isapre, Cargo } = require("../shared/associations.js")

async function obtenerLiquidacionCompleta(liquidacionId) {
    const liquidacion = await Liquidacion.findByPk(liquidacionId, {
        include: [
            { model: PeriodoRemuneracion, include: [Empresa] },
            { model: Trabajador, include: [{ model: Persona, include: [Afp, Isapre] }] },
            { model: LiquidacionLinea }
        ],
        order: [[LiquidacionLinea, "orden", "ASC"]]
    })

    const cargo = await Cargo.findByPk(liquidacion.snapshot_contrato.cargo_id)

    return { liquidacion, cargo }
}

module.exports = {
    obtenerLiquidacionCompleta
}