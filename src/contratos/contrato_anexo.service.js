const { ContratoAnexo, ContratoTrabajo, Trabajador, Jornada } = require("../shared/associations.js")
const { COMUNAS } = require("../shared/comunas_lre.js")
const { sequelize } = require("../shared/database.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { PERMISOS, exigirRol } = require("../shared/permisos.js")
const { Op } = require("sequelize")


// Cambio de plantilla de jornada por anexo. Solo cambia el horario: la plantilla nueva debe tener las mismas
// horas y días que el contrato, porque de ellos sale el valor hora. Si cambian, primero va el anexo de horas o días.
async function validarJornadaDelAnexo(valorNuevo, contrato) {
    const jornada = await Jornada.findByPk(Number(valorNuevo))

    if (jornada === null || jornada.empresa_id !== contrato.Trabajador.empresa_id || !jornada.activo) {
        throw new NotFoundError("Jornada no encontrada")
    }
    if (contrato.tipo_jornada === "excluido_limitacion") {
        throw new ConflictError("Un contrato excluido de la limitación de jornada no lleva plantilla de horario")
    }
    if (Number(jornada.id) === Number(contrato.jornada_id)) {
        throw new ConflictError("El contrato ya tiene esa jornada")
    }
    if (Number(jornada.horas_semanales) !== Number(contrato.horas_semanales) || Number(jornada.dias_trabajados) !== Number(contrato.dias_trabajados)) {
        throw new ConflictError(`La jornada "${jornada.nombre}" es de ${Number(jornada.horas_semanales)} horas en ${jornada.dias_trabajados} días y el contrato tiene ${Number(contrato.horas_semanales)} horas en ${contrato.dias_trabajados} días. Primero registra y firma el anexo de horas semanales o días trabajados.`)
    }
}

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
        "comuna_prestacion",
        "jornada_id"
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

    if (datos.campo_modificado === "jornada_id") {
        await validarJornadaDelAnexo(datos.valor_nuevo, contrato)
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

    if (anexo.campo_modificado === "jornada_id") {
        await validarJornadaDelAnexo(anexo.valor_nuevo, contrato)
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

async function listarAnexos(contratoId, empresasPermitidas) {
    const contrato = await ContratoTrabajo.findByPk(contratoId, {
        include: [Trabajador]
    })

    if (contrato === null || !empresasPermitidas.includes(contrato.Trabajador.empresa_id)) {
        throw new NotFoundError("Contrato no encontrado")
    }

    return await ContratoAnexo.findAll({
        where: { contrato_id: contrato.id },
        order: [["fecha_vigencia", "ASC"], ["id", "ASC"]]
    })
}

module.exports = {
    crearAnexo,
    firmarAnexo,
    listarAnexos
}