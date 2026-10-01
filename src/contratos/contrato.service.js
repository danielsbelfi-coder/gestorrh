const { ContratoTrabajo, Trabajador } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError } = require("../shared/errors.js")

async function crearContrato(datos) {
    return await ContratoTrabajo.create(datos)
}

async function listarContratos(empresasPermitidas) {
    return await ContratoTrabajo.findAll({
        include: [{
            model: Trabajador,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
            },
            required: true
        }]
    })
}

async function obtenerContratoPorId(id, empresasPermitidas) {
    const contrato = await ContratoTrabajo.findByPk(id, {
        include: [Trabajador]
    })

    if (contrato === null || !empresasPermitidas.includes(contrato.Trabajador.empresa_id)) {
        throw new NotFoundError("Contrato no encontrado")
    }

    return contrato

}

module.exports = {
    crearContrato,
    listarContratos,
    obtenerContratoPorId
}