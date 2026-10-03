const { Asistencia, AsistenciaCorreccion, Trabajador } = require("../shared/associations.js")
const { sequelize } = require("../shared/database.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")

async function crearCorreccion(datos, empresasPermitidas) {
    const CAMPOS_MODIFICABLES = [
        "hora_entrada",
        "hora_salida",
        "tipo",
        "observaciones"
    ]

    const asistencia = await Asistencia.findByPk(datos.asistencia_id, {
        include: [Trabajador]
    })

    if (asistencia === null) {
        throw new NotFoundError("Asistencia no encontrada")
    }
    if (!empresasPermitidas.includes(asistencia.Trabajador.empresa_id)) {
        throw new NotFoundError("Asistencia no encontrada")
    }
    
    if (!CAMPOS_MODIFICABLES.includes(datos.campo_modificado)) {
        throw new ValidationError("Existen parámetros que no pueden ser modificados")
    }

    return await AsistenciaCorreccion.create(datos)
}

async function aprobarCorreccion(id, empresasPermitidas, usuarioId) {
    const correccion = await AsistenciaCorreccion.findByPk(id)
    if (correccion === null) {
        throw new NotFoundError("Corrección no encontrada")
    }
    const asistencia = await Asistencia.findByPk(correccion.asistencia_id, {
        include: [Trabajador]
    })
    if (!empresasPermitidas.includes(asistencia.Trabajador.empresa_id)) {
        throw new NotFoundError("Corrección no encontrada")
    }
    if (correccion.estado_aprobacion !== "pendiente") {
        throw new ConflictError("Modificacion ya fue procesada")
    }


    await sequelize.transaction(async (t) => {
        await asistencia.update({
            [correccion.campo_modificado]: correccion.valor_nuevo
        },
            {
                transaction: t
            },
        )
        await correccion.update({
            estado_aprobacion: "aprobada",
            fecha_aprobacion: new Date(),
            aprobado_por_id: usuarioId
        },
            {
                transaction: t
            }
        )
    })
    return correccion
}

module.exports = {
   crearCorreccion,
   aprobarCorreccion
}