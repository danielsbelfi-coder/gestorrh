const { ResumenAsistencia, Trabajador, PeriodoRemuneracion,
    Asistencia, ContratoTrabajo, VariablePeriodo,
    ConceptoRemuneracion, LicenciaMedica
} = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { obtenerPeriodoPorId, rangoDelPeriodo, trabajadoresDelPeriodo } = require("../remuneraciones/periodo_remuneracion.service.js")
const { Op } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { diasLicenciaEnMes, anotarDiasTrabajados } = require("../remuneraciones/dias_pago.js")
const { libroDelTrabajador } = require("./libro_asistencia.service.js")



const CAMPOS_MANUALES = ["dias_inasistencia", "dias_permiso_sin_goce", "dias_vacaciones"]

function valoresDelResumen(datos, diasLicencia) {
    const valores = { dias_licencia_medica: diasLicencia }

    for (const campo of [...CAMPOS_MANUALES, "minutos_atraso"]) {
        const valor = datos[campo] === undefined ? 0 : Number(datos[campo])

        if (!Number.isInteger(valor) || valor < 0) {
            throw new ValidationError(`${campo} debe ser un número entero igual o mayor a 0`)
        }

        valores[campo] = valor
    }

    const totalDias = CAMPOS_MANUALES.reduce((suma, campo) => suma + valores[campo], 0) + diasLicencia

    if (totalDias > 31) {
        throw new ValidationError("La suma de los días no puede superar los días del mes")
    }

    return valores
}

async function diasLicenciaDelPeriodo(trabajadorId, periodo, transaction) {
    const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)

    const licencias = await LicenciaMedica.findAll({
        where: {
            trabajador_id: trabajadorId,
            fecha_inicio: { [Op.lte]: ultimoDia },
            fecha_termino: { [Op.gte]: primerDia }
        },
        transaction
    })

    return diasLicenciaEnMes(licencias, periodo.anio, periodo.mes)
}

async function sincronizarLicenciasResumen(trabajadorId, periodo, transaction) {
    const resumen = await ResumenAsistencia.findOne({
        where: { periodo_id: periodo.id, trabajador_id: trabajadorId },
        transaction
    })

    if (resumen === null) {
        return
    }

    const cambios = { dias_licencia_medica: await diasLicenciaDelPeriodo(trabajadorId, periodo, transaction) }

    if (resumen.estado === "aprobado") {
        Object.assign(cambios, { estado: "pendiente", aprobado_por_id: null, fecha_aprobacion: null })
    }

    await resumen.update(cambios, { transaction })
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

    const valores = valoresDelResumen(datos, await diasLicenciaDelPeriodo(trabajador.id, periodo))

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

    const resumenes = await ResumenAsistencia.findAll({
        where: { periodo_id: periodo.id },
        order: [["trabajador_id", "ASC"]]
    })

    const trabajadores = await Trabajador.findAll({
        where: { id: resumenes.map((r) => r.trabajador_id) },
        attributes: ["id", "fecha_ingreso", "fecha_termino"],
        raw: true
    })

    return anotarDiasTrabajados(resumenes.map((r) => r.toJSON()), trabajadores, periodo.anio, periodo.mes)
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

// Resumen y horas extra del mes a partir del libro de asistencia (solo marcas aprobadas).
async function generarParaTrabajador(trabajador, periodo, conceptoHoras, usuarioId, transaction) {
    const libro = await libroDelTrabajador(trabajador, periodo.anio, periodo.mes, transaction)
    const { totales } = libro

    const dias = {
        dias_inasistencia: totales.dias_inasistencia,
        dias_licencia_medica: await diasLicenciaDelPeriodo(trabajador.id, periodo, transaction),
        dias_permiso_sin_goce: totales.dias_permiso_sin_goce,
        dias_vacaciones: totales.dias_vacaciones,
        minutos_atraso: totales.minutos_atraso
    }

    const resultado = {
        trabajador_id: trabajador.id,
        ...dias,
        marcas_pendientes: totales.marcas_pendientes,
        dias_con_advertencias: libro.dias.filter((d) => d.advertencias.length > 0).length,
        advertencias: libro.advertencias
    }

    const existente = await ResumenAsistencia.findOne({
        where: { periodo_id: periodo.id, trabajador_id: trabajador.id },
        transaction
    })

    if (existente === null) {
        await ResumenAsistencia.create({
            periodo_id: periodo.id,
            trabajador_id: trabajador.id,
            ...dias,
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

    if (libro.contrato === null) {
        resultado.horas_extra = "omitidas: sin contrato en el mes"
        return resultado
    }

    const horas = totales.horas_extra

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
            glosa: "Propuesta desde el libro de asistencia",
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

    const trabajadores = await trabajadoresDelPeriodo(periodo)

    const conceptoHoras = await ConceptoRemuneracion.findOne({ where: { empresa_id: null, codigo: "HORAS_EXTRA_50" } })

    return await sequelize.transaction(async (transaction) => {
        const resultados = []

        for (const trabajador of trabajadores) {
            resultados.push(await generarParaTrabajador(trabajador, periodo, conceptoHoras, usuarioId, transaction))
        }

        return resultados
    })
}

module.exports = {
    guardarResumen,
    listarResumenes,
    aprobarResumen,
    devolverResumen,
    generarDesdeAsistencia,
    sincronizarLicenciasResumen
}