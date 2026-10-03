const { ContratoTrabajo, Trabajador, Cargo } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError } = require("../shared/errors.js")

async function crearContrato(datos, empresasPermitidas) {
    const trabajador = await Trabajador.findByPk(datos.trabajador_id)

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    const contratoVigente = await ContratoTrabajo.findOne({
        where: {
            trabajador_id: datos.trabajador_id,
            estado: "vigente"
        }
    })

    if (contratoVigente !== null ) {
        throw new ConflictError("El trabajador ya tiene un contrato vigente")
    }

    const cargo = await Cargo.findByPk(datos.cargo_id)

    if (cargo === null || cargo.empresa_id !== trabajador.empresa_id) {
        throw new NotFoundError("Cargo no encontrado")
    }

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