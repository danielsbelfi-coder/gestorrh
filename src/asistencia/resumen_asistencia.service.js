const { ResumenAsistencia, Trabajador, PeriodoRemuneracion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { obtenerPeriodoPorId } = require("../remuneraciones/periodo_remuneracion.service.js")

const CAMPOS_DIAS = ["dias_inasistencia", "dias_licencia_medica", "dias_permiso_sin_goce", "dias_vacaciones"]

function valoresDelResumen(datos) {
    const valores = {}

    for (const campo of [...CAMPOS_DIAS, "minutos_atraso"]) {
        const valor = datos[campo] === undefined ? 0 : Number(datos[campo])

        if (!Number.isInteger(valor) || valor < 0) {
            throw new ValidationError(`${campo} debe ser un número entero igual o mayor a 0`)
        }

        valores[campo] = valor
    }

    const totalDias = CAMPOS_DIAS.reduce((suma, campo) => suma + valores[campo], 0)

    if (totalDias > 30) {
        throw new ValidationError("La suma de los días no puede superar 30")
    }

    return valores
}

async function guardarResumen(datos, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(datos.periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.REGISTRAR_VARIABLES)

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones está cerrado")
    }

    const trabajador = await Trabajador.findByPk(datos.trabajador_id)

    if (trabajador === null || trabajador.empresa_id !== periodo.empresa_id) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    const valores = valoresDelResumen(datos)

    const existente = await ResumenAsistencia.findOne({
        where: { periodo_id: periodo.id, trabajador_id: trabajador.id }
    })

    if (existente === null) {
        const resumen = await ResumenAsistencia.create({
            periodo_id: periodo.id,
            trabajador_id: trabajador.id,
            ...valores,
            estado: "pendiente",
            fuente: "manual",
            usuario_registro_id: usuarioId
        })

        return { resumen, creado: true }
    }

    if (existente.estado === "aprobado") {
        throw new ConflictError("El resumen está aprobado: devuélvelo a pendiente para modificarlo")
    }

    await existente.update({ ...valores, fuente: "manual", usuario_registro_id: usuarioId })

    return { resumen: existente, creado: false }
}

async function listarResumenes(periodoId, empresasPermitidas) {
    const periodo = await obtenerPeriodoPorId(periodoId, empresasPermitidas)

    return await ResumenAsistencia.findAll({
        where: { periodo_id: periodo.id },
        order: [["trabajador_id", "ASC"]]
    })
}

async function obtenerResumen(id, empresasPermitidas, usuarioId, permiso) {
    const resumen = await ResumenAsistencia.findByPk(id, { include: [PeriodoRemuneracion] })

    if (resumen === null || !empresasPermitidas.includes(resumen.PeriodoRemuneracion.empresa_id)) {
        throw new NotFoundError("Resumen no encontrado")
    }

    await exigirRol(usuarioId, resumen.PeriodoRemuneracion.empresa_id, permiso)

    if (resumen.PeriodoRemuneracion.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones está cerrado")
    }

    return resumen
}

async function aprobarResumen(id, empresasPermitidas, usuarioId) {
    const resumen = await obtenerResumen(id, empresasPermitidas, usuarioId, PERMISOS.APROBAR_VARIABLES)

    if (resumen.estado === "aprobado") {
        throw new ConflictError("El resumen ya está aprobado")
    }

    return await resumen.update({ estado: "aprobado", aprobado_por_id: usuarioId, fecha_aprobacion: new Date() })
}

async function devolverResumen(id, empresasPermitidas, usuarioId) {
    const resumen = await obtenerResumen(id, empresasPermitidas, usuarioId, PERMISOS.APROBAR_VARIABLES)

    if (resumen.estado === "pendiente") {
        throw new ConflictError("El resumen ya está pendiente")
    }

    return await resumen.update({ estado: "pendiente", aprobado_por_id: null, fecha_aprobacion: null })
}

module.exports = {
    guardarResumen,
    listarResumenes,
    aprobarResumen,
    devolverResumen
}