const { ContratoAnexo, ContratoTrabajo, Trabajador } = require("../shared/associations.js")
const { sequelize } = require("../shared/database.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")

async function crearAnexo(datos, empresasPermitidas) {
    const CAMPOS_MODIFICABLES = [
        "sueldo_base", 
        "horas_semanales", 
        "tipo_jornada", 
        "dias_trabajados", 
        "funciones", 
        "lugar_prestacion_servicios", 
        "sistema_remuneracion", 
        "periodicidad_pago", 
        "fecha_termino"
    ]
    const contrato = await ContratoTrabajo.findByPk(datos.contrato_id, {
        include: [Trabajador]
    })

    if (contrato === null) {
        throw new NotFoundError("Contrato no encontrado")
    }
    if (!empresasPermitidas.includes(contrato.Trabajador.empresa_id)) {
        throw new NotFoundError("Contrato no encontrado")
    }
    if (contrato.estado !== "vigente") {
        throw new ConflictError("No se puede modificar un contrato que no está vigente")
    }

    if (!CAMPOS_MODIFICABLES.includes(datos.campo_modificado)) {
        throw new ValidationError("Existen parámetros que no pueden ser modificados")
    }

    return await ContratoAnexo.create(datos)
}

async function firmarAnexo(id, empresasPermitidas) {
    const anexo = await ContratoAnexo.findByPk(id)
    if (anexo === null) {
        throw new NotFoundError("Anexo no encontrado")
    }
    const contrato = await ContratoTrabajo.findByPk(anexo.contrato_id, {
        include: [Trabajador]
    })    
    if (!empresasPermitidas.includes(contrato.Trabajador.empresa_id)) {
        throw new NotFoundError("Anexo no encontrado")
    }
    if (anexo.estado_firma !== "pendiente") {
        throw new ConflictError("El anexo ya fue procesado")
    }

    await sequelize.transaction(async (t) => {
        await contrato.update({
            [anexo.campo_modificado]: anexo.valor_nuevo
        },
            {
                transaction: t
            },
        )
        await anexo.update({
            estado_firma: "firmado",
            fecha_firma: new Date()
        },
            {
                transaction: t
            }
        )
    })
    return anexo
}

module.exports = {
    crearAnexo,
    firmarAnexo
}