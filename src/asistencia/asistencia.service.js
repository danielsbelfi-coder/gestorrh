const { Asistencia, Trabajador, PeriodoRemuneracion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { Op } = require("sequelize")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")

async function crearAsistencia(datos, empresasPermitidas, usuarioId) {
    const trabajador = await Trabajador.findByPk(datos.trabajador_id)

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)

    const asistenciaExistente = await Asistencia.findOne({
        where: {
            trabajador_id: datos.trabajador_id,
            fecha: datos.fecha,
        }

    })
    if (asistenciaExistente !== null) {
        throw new ConflictError("Ya existe un registro de asistencia para ese trabajador en esa fecha")
    }
    return await Asistencia.create(datos, {
        fields: [
            "trabajador_id",
            "fecha",
            "hora_entrada",
            "hora_salida",
            "tipo",
            "fuente",
            "observaciones",
            "usuario_registro_id"
        ]
    })
}

async function listarAsistencias(empresasPermitidas) {
    return await Asistencia.findAll({
        include: [{
            model: Trabajador,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
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

const ESTADOS_APROBACION = ["pendiente", "aprobada", "rechazada"]

async function cambiarAprobacionAsistencia(id, estado, empresasPermitidas, usuarioId) {
    const asistencia = await obtenerAsistenciaPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, asistencia.Trabajador.empresa_id, PERMISOS.APROBAR_ASISTENCIA)

    if (!ESTADOS_APROBACION.includes(estado)) {
        throw new ValidationError("El estado debe ser pendiente, aprobada o rechazada")
    }
    if (asistencia.estado_aprobacion === estado) {
        throw new ConflictError(`La marca ya está ${estado}`)
    }

    // Una marca de un mes ya cerrado no se toca: ese mes ya se liquidó.
    const periodo = await PeriodoRemuneracion.findOne({
        where: {
            empresa_id: asistencia.Trabajador.empresa_id,
            anio: Number(asistencia.fecha.slice(0, 4)),
            mes: Number(asistencia.fecha.slice(5, 7))
        }
    })
    if (periodo !== null && periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de esa fecha está cerrado")
    }

    return await asistencia.update({
        estado_aprobacion: estado,
        aprobado_por_id: estado === "pendiente" ? null : usuarioId,
        fecha_aprobacion: estado === "pendiente" ? null : new Date()
    })
}

module.exports = {
    crearAsistencia,
    listarAsistencias,
    obtenerAsistenciaPorId,
    cambiarAprobacionAsistencia
}
