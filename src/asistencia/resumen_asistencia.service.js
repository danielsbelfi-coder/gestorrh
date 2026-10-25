const { ResumenAsistencia, Trabajador, PeriodoRemuneracion,
    Asistencia, ContratoTrabajo, VariablePeriodo,
    ConceptoRemuneracion
} = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { obtenerPeriodoPorId } = require("../remuneraciones/periodo_remuneracion.service.js")
const { Op } = require("sequelize")
const { sequelize } = require("../shared/database.js")



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

function horasEntre(horaEntrada, horaSalida) {
    const [horaE, minE] = horaEntrada.split(":")
    const [horaS, minS] = horaSalida.split(":")

    return ((Number(horaS) * 60 + Number(minS)) - (Number(horaE) * 60 + Number(minE))) / 60
}

async function generarParaTrabajador(trabajador, periodo, primerDia, ultimoDia, conceptoHoras, usuarioId, transaction) {
    const asistencias = await Asistencia.findAll({
        where: {
            trabajador_id: trabajador.id,
            fecha: { [Op.between]: [primerDia, ultimoDia] },
            estado_aprobacion: "aprobada"
        },
        transaction
    })
    const contar = (tipo) => asistencias.filter((asistencia) => asistencia.tipo === tipo).length

    const dias = {
        dias_inasistencia: contar("inasistencia"),
        dias_licencia_medica: contar("licencia_medica"),
        dias_permiso_sin_goce: contar("permiso_sin_goce"),
        dias_vacaciones: contar("vacaciones")
    }

    const resultado = { trabajador_id: trabajador.id, ...dias }

    const existente = await ResumenAsistencia.findOne({
        where: { periodo_id: periodo.id, trabajador_id: trabajador.id },
        transaction
    })

    if (existente === null) {
        await ResumenAsistencia.create({
            periodo_id: periodo.id,
            trabajador_id: trabajador.id,
            ...dias,
            minutos_atraso: 0,
            estado: "pendiente",
            fuente: "asistencia",
            usuario_registro_id: usuarioId
        }, { transaction })
        resultado.resumen = "creado"
    } else if (existente.estado === "aprobado") {
        resultado.resumen = "omitido: ya estaba aprobado"
    } else {
        await existente.update({ ...dias, fuente: "asistencia", usuario_registro_id: usuarioId }, { transaction })
        resultado.resumen = "actualizado"
    }

    const contrato = await ContratoTrabajo.findOne({
        where: { trabajador_id: trabajador.id, estado: "vigente" },
        transaction
    })

    if (contrato === null) {
        resultado.horas_extra = "omitidas: sin contrato vigente"
        return resultado
    }

    const horasDiarias = Number(contrato.horas_semanales) / 5
    let horas = 0

    for (const asistencia of asistencias) {
        if (asistencia.hora_entrada === null || asistencia.hora_salida === null) {
            continue
        }

        const trabajadas = horasEntre(asistencia.hora_entrada, asistencia.hora_salida)

        if (trabajadas > horasDiarias) {
            horas += trabajadas - horasDiarias
        }
    }

    horas = Math.round(horas * 100) / 100

    const filtroHoras = {
        periodo_id: periodo.id,
        trabajador_id: trabajador.id,
        concepto_id: conceptoHoras.id,
        fuente: "asistencia"
    }

    const aprobadas = await VariablePeriodo.findOne({ where: { ...filtroHoras, estado: "aprobada" }, transaction })

    if (aprobadas !== null) {
        resultado.horas_extra = "omitidas: ya hay horas extra aprobadas desde la asistencia"
        return resultado
    }

    await VariablePeriodo.destroy({ where: { ...filtroHoras, estado: "pendiente" }, transaction })

    if (horas > 0) {
        await VariablePeriodo.create({
            ...filtroHoras,
            cantidad: horas,
            monto: null,
            glosa: "Propuesta desde la asistencia",
            estado: "pendiente",
            usuario_registro_id: usuarioId
        }, { transaction })
    }

    resultado.horas_extra = horas
    return resultado
}

async function generarDesdeAsistencia(periodoId, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodoId, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.REGISTRAR_VARIABLES)

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones está cerrado")
    }

    const mm = String(periodo.mes).padStart(2, "0")
    const primerDia = `${periodo.anio}-${mm}-01`
    const ultimoDia = `${periodo.anio}-${mm}-${String(new Date(periodo.anio, periodo.mes, 0).getDate()).padStart(2, "0")}`

    const conceptoHoras = await ConceptoRemuneracion.findOne({ where: { empresa_id: null, codigo: "HORAS_EXTRA_50" } })

    const trabajadores = await Trabajador.findAll({
        where: {
            empresa_id: periodo.empresa_id,
            estado: { [Op.ne]: "postulante" },
            fecha_ingreso: { [Op.lte]: ultimoDia },
            [Op.or]: [{ fecha_termino: null }, { fecha_termino: { [Op.gte]: primerDia } }]
        },
        order: [["id", "ASC"]]
    })

    return await sequelize.transaction(async (transaction) => {
        const resultados = []

        for (const trabajador of trabajadores) {
            resultados.push(await generarParaTrabajador(trabajador, periodo, primerDia, ultimoDia, conceptoHoras, usuarioId, transaction))
        }

        return resultados
    })
}

module.exports = {
    guardarResumen,
    listarResumenes,
    aprobarResumen,
    devolverResumen,
    generarDesdeAsistencia
}