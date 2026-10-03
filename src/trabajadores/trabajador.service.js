const { Trabajador } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError } = require("../shared/errors.js")

async function crearTrabajador(datos, empresasPermitidas) {

    if (!empresasPermitidas.includes(Number(datos.empresa_id))) {
        throw new NotFoundError("Empresa no encontrada")
    }
    
    const trabajadorExistente = await Trabajador.findOne({
        where: {
            persona_id: datos.persona_id,
            empresa_id: datos.empresa_id,
            estado: "activo"
        }

    })
    if (trabajadorExistente !== null) {
        throw new ConflictError("Trabajador ya tiene un vinculo laboral existente")
    }
    return await Trabajador.create(datos)
}

async function listarTrabajadores(empresasPermitidas) {
    return await Trabajador.findAll({
            where: {
                empresa_id: { [Op.in]: empresasPermitidas}
            }
        })
}

async function obtenerTrabajadorPorId(id, empresasPermitidas) {
    const trabajador = await Trabajador.findByPk(id)

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }
    return trabajador

}

async function actualizarTrabajador(id, datos, empresasPermitidas) {
    const trabajador = await obtenerTrabajadorPorId(id, empresasPermitidas)

    const actualizar = await trabajador.update(datos, {
        fields: ["fecha_ingreso", "fecha_termino", "estado"]
    })

    return actualizar
}

async function desactivarTrabajador(id, empresasPermitidas) {
    const trabajadorDesvinculado = await actualizarTrabajador(id, { estado: "desvinculado" }, empresasPermitidas)

    return trabajadorDesvinculado
}

module.exports = {
    crearTrabajador,
    listarTrabajadores,
    obtenerTrabajadorPorId,
    actualizarTrabajador,
    desactivarTrabajador
}