const { ContratoAnexo, ContratoTrabajo, Trabajador } = require("../shared/associations.js")
const { COMUNAS } = require("../shared/comunas_lre.js")
const { sequelize } = require("../shared/database.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { PERMISOS, exigirRol } = require("../shared/permisos.js")


async function crearAnexo(datos, empresasPermitidas, usuarioId) {
    const CAMPOS_MODIFICABLES = [
        "sueldo_base",
        "horas_semanales",
        "tipo_jornada",
        "dias_trabajados",
        "funciones",
        "lugar_prestacion_servicios",
        "sistema_remuneracion",
        "periodicidad_pago",
        "fecha_termino",
        "comuna_prestacion"
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

    await exigirRol(usuarioId, contrato.Trabajador.empresa_id, PERMISOS.CREAR_ANEXO)

    if (contrato.estado !== "vigente") {
        throw new ConflictError("No se puede modificar un contrato que no está vigente")
    }

    if (!CAMPOS_MODIFICABLES.includes(datos.campo_modificado)) {
        throw new ValidationError("Existen parámetros que no pueden ser modificados")
    }

    if (datos.campo_modificado === "comuna_prestacion" && COMUNAS[datos.valor_nuevo] === undefined) {
        throw new ValidationError("La comuna de prestación no está en la tabla de la Dirección del Trabajo")
    }


    return await ContratoAnexo.create({
        ...datos, valor_anterior: contrato[
            datos.campo_modificado
        ]
    }, {
        fields: [
            "contrato_id",
            "fecha_vigencia",
            "campo_modificado",
            "valor_anterior",
            "valor_nuevo",
            "motivo",
            "usuario_creo_id"
        ]
    }
    )
}

async function firmarAnexo(id, empresasPermitidas, usuarioId) {
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
    await exigirRol(usuarioId, contrato.Trabajador.empresa_id, PERMISOS.FIRMAR_ANEXO)

    if (anexo.estado_firma !== "pendiente") {
        throw new ConflictError("El anexo ya fue procesado")
    }

    await sequelize.transaction(async (t) => {
        await anexo.update({
            valor_anterior: contrato[anexo.campo_modificado],
            estado_firma: "firmado",
            fecha_firma: new Date(),
            usuario_firmo_id: usuarioId
        },
            {
                transaction: t
            }
        )
        await contrato.update({
            [anexo.campo_modificado]: anexo.valor_nuevo
        },
            {
                transaction: t
            },
        )

    })
    return anexo
}


async function listarAnexo(empresasPermitidas) {
    return await Contratoanexo.findAll({
        include: [{
            model: Trabajador,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
            },
            required: true
        }]
    })
}

module.exports = {
    crearAnexo,
    firmarAnexo,
    listarAnexo
}