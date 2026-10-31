const { SituacionPrevisional } = require("../shared/associations.js")
const { obtenerPersonaPorId } = require("./persona.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")

const TIPOS_PENSION = ["vejez", "invalidez_total", "invalidez_parcial", "sobrevivencia"]

async function crearSituacion(personaId, datos, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)

    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    if (typeof datos?.desde !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(datos.desde)) {
        throw new ValidationError("El mes desde el que rige debe tener el formato AAAA-MM")
    }
    if (typeof datos.pensionado !== "boolean" || typeof datos.cotiza_afp !== "boolean") {
        throw new ValidationError("Debe indicar si es pensionado y si cotiza en la AFP (true o false)")
    }
    if (datos.pensionado && !TIPOS_PENSION.includes(datos.tipo_pension)) {
        throw new ValidationError("Si es pensionado, el tipo de pensión debe ser vejez, invalidez_total, invalidez_parcial o sobrevivencia")
    }
    if (!datos.pensionado && datos.tipo_pension) {
        throw new ValidationError("El tipo de pensión solo se indica si es pensionado")
    }
    const tecnico = datos.tecnico_extranjero ?? false
    if (typeof tecnico !== "boolean") {
        throw new ValidationError("«Técnico extranjero» debe ser true o false")
    }
    if (tecnico && datos.pensionado) {
        throw new ValidationError("Un técnico extranjero (Ley 18.156) no se registra como pensionado")
    }

    try {
        return await SituacionPrevisional.create({
            persona_id: persona.id,
            desde: `${datos.desde}-01`,
            pensionado: datos.pensionado,
            // El técnico extranjero no cotiza en la AFP (Ley 18.156).
            cotiza_afp: tecnico ? false : datos.cotiza_afp,
            tecnico_extranjero: tecnico,
            tipo_pension: datos.pensionado ? datos.tipo_pension : null,
            usuario_registro_id: usuarioId
        })
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError(`Ya existe una situación previsional desde ${datos.desde}; elimínela antes de registrar otra`)
        }
        throw error
    }
}

async function listarSituaciones(personaId, empresasPermitidas) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)

    return await SituacionPrevisional.findAll({
        where: { persona_id: persona.id },
        order: [["desde", "DESC"]]
    })
}

async function eliminarSituacion(personaId, id, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)

    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    const situacion = await SituacionPrevisional.findOne({ where: { id, persona_id: persona.id } })

    if (situacion === null) {
        throw new NotFoundError("Situación previsional no encontrada")
    }

    await situacion.destroy()
}

module.exports = {
    crearSituacion,
    listarSituaciones,
    eliminarSituacion
}