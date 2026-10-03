const { Asistencia, Trabajador } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError } = require("../shared/errors.js")

async function crearAsistencia(datos, empresasPermitidas) {
    const trabajador = await Trabajador.findByPk(datos.trabajador_id)

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    const asistenciaExistente = await Asistencia.findOne({
        where: {
            trabajador_id: datos.trabajador_id,
            fecha: datos.fecha,
        }

    })
    if (asistenciaExistente !== null) {
        throw new ConflictError("Ya existe un registro de asistencia para ese trabajador en esa fecha")
    }
    return await Asistencia.create(datos)
}

async function listarAsistencias(empresasPermitidas) {
    return await Asistencia.findAll({
        include: [{
            model: Trabajador,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas}
            },
            required: true
        }]
    })
}

async function obtenerAsistenciaPorId(id, empresasPermitidas) {
    const asistencia = await Asistencia.findByPk(id, {
        include: [Trabajador]
    })

    if (asistencia === null || !empresasPermitidas.includes(asistencia.Trabajador.empresa_id)) {
        throw new NotFoundError("Asistencia no encontrada")
    }

    return asistencia
}

module.exports = {
    crearAsistencia,
    listarAsistencias,
    obtenerAsistenciaPorId
}
