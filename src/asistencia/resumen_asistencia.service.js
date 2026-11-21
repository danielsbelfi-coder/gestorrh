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
const { RECARGOS, horasPorRecargo } = require("../remuneraciones/horas_extra.js")



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
async function generarParaTrabajador(trabajador, periodo, conceptosHoras, usuarioId, transaction) {
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
        // No se toca, pero se avisa si ya no coincide con el libro (se cambió una marca después de aprobarlo).
        const distinto = ["dias_inasistencia", "dias_permiso_sin_goce", "dias_vacaciones", "minutos_atraso"]
            .some((campo) => Number(existente[campo] ?? 0) !== Number(dias[campo] ?? 0))
        resultado.resumen = distinto ? "omitido: está aprobado y no coincide con el libro" : "omitido: ya estaba aprobado"
        resultado.resumen_desactualizado = distinto
    } else {
        await existente.update({ ...dias, fuente: "asistencia", usuario_registro_id: usuarioId }, { transaction })
        resultado.resumen = "actualizado"
    }

    if (libro.contrato === null) {
        resultado.horas_extra = "omitidas: sin contrato en el mes"
        return resultado
    }

    // Las horas extra del mes salen solo del libro: una variable por recargo (50 % y 100 %) con fuente "asistencia".
    // Jornada del art. 25 (paquete W): salen de los turnos de conducción aprobados (las horas sobre el tope mensual, al
    // 50 %), y el pago de esperas se propone como «Tiempo de espera».
    let horas = horasPorRecargo(totales)
    let glosaHoras = "Propuesta desde el libro de asistencia"
    if (libro.dias.some((d) => d.esperado.tipo === "turnos")) {
        const { datosParaRemuneraciones } = require("./turno_conduccion.service.js")
        const turnos = await datosParaRemuneraciones(trabajador, periodo.anio, periodo.mes)
        horas = { 50: turnos.horasSobreTope, 100: 0 }
        glosaHoras = `Propuesta desde los turnos de conducción: horas sobre el tope de ${String(turnos.topeHoras).replace(".", ",")} h`
        resultado.turnos = { jornada_horas: Math.round(turnos.minutosJornada / 60 * 100) / 100, tope_horas: turnos.topeHoras, pendientes: turnos.pendientes, con_errores: turnos.conErrores }
        resultado.tiempo_espera = await sincronizarTiempoEspera(trabajador, periodo, turnos, usuarioId, transaction)
    }
    const filtroHoras = {
        periodo_id: periodo.id,
        trabajador_id: trabajador.id,
        concepto_id: Object.values(conceptosHoras).map((c) => c.id),
        fuente: "asistencia"
    }

    // Horas ya aprobadas desde el libro: si siguen iguales, no se tocan. Si el libro cambió (se modificó una marca después
    // de aprobar), la propuesta se reemplaza y queda pendiente de aprobar otra vez (el libro es el origen de las horas).
    const aprobadas = await VariablePeriodo.findAll({ where: { ...filtroHoras, estado: "aprobada" }, transaction })
    if (aprobadas.length > 0) {
        const aprobadoPor = (recargo) => Math.round(aprobadas
            .filter((v) => v.concepto_id === conceptosHoras[recargo].id)
            .reduce((suma, v) => suma + Number(v.cantidad ?? 0), 0) * 100) / 100
        const iguales = RECARGOS.every((recargo) => aprobadoPor(recargo) === horas[recargo])
        if (iguales) {
            resultado.horas_extra = "sin cambios: las horas aprobadas coinciden con el libro"
            return resultado
        }
        resultado.horas_extra_reemplazadas = RECARGOS
            .filter((recargo) => aprobadoPor(recargo) !== horas[recargo])
            .map((recargo) => `al ${recargo} %: ${aprobadoPor(recargo)} h aprobadas → ${horas[recargo]} h en el libro`)
            .join("; ")
    }

    await VariablePeriodo.destroy({ where: filtroHoras, transaction })

    for (const recargo of RECARGOS) {
        if (horas[recargo] > 0) {
            await VariablePeriodo.create({
                periodo_id: periodo.id,
                trabajador_id: trabajador.id,
                concepto_id: conceptosHoras[recargo].id,
                fuente: "asistencia",
                cantidad: horas[recargo],
                monto: null,
                mes_origen: null,
                glosa: glosaHoras,
                estado: "pendiente",
                usuario_registro_id: usuarioId
            }, { transaction })
        }
    }

    resultado.horas_extra = Math.round((horas[50] + horas[100]) * 100) / 100
    resultado.horas_extra_50 = horas[50]
    resultado.horas_extra_100 = horas[100]
    return resultado
}

// Variable «Tiempo de espera» propuesta desde los turnos (fuente "turnos"). Si la aprobada coincide, no se toca; si
// cambió, se reemplaza y queda pendiente, como las horas extra del libro.
async function sincronizarTiempoEspera(trabajador, periodo, turnos, usuarioId, transaction) {
    const concepto = await ConceptoRemuneracion.findOne({ where: { empresa_id: null, codigo: "TIEMPO_ESPERA" }, transaction })
    if (concepto === null) {
        return "omitido: falta el concepto común TIEMPO_ESPERA"
    }
    const filtro = { periodo_id: periodo.id, trabajador_id: trabajador.id, concepto_id: concepto.id, fuente: "turnos" }
    const aprobada = await VariablePeriodo.findOne({ where: { ...filtro, estado: "aprobada" }, transaction })
    if (aprobada && Number(aprobada.monto) === turnos.montoEsperas) {
        return "sin cambios: el monto aprobado coincide con los turnos"
    }
    await VariablePeriodo.destroy({ where: filtro, transaction })
    if (turnos.montoEsperas > 0) {
        const horasTexto = String(Math.round(turnos.minutosPagables / 60 * 100) / 100).replace(".", ",")
        await VariablePeriodo.create({
            ...filtro,
            monto: turnos.montoEsperas,
            cantidad: null,
            mes_origen: null,
            glosa: `Desde los turnos de conducción: ${horasTexto} h de espera pagable`,
            estado: "pendiente",
            usuario_registro_id: usuarioId
        }, { transaction })
    }
    return turnos.montoEsperas
}

async function generarDesdeAsistencia(periodoId, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodoId, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.REGISTRAR_VARIABLES)

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones está cerrado")
    }

    const trabajadores = await trabajadoresDelPeriodo(periodo)

    const conceptos = await ConceptoRemuneracion.findAll({ where: { empresa_id: null, codigo: ["HORAS_EXTRA_50", "HORAS_EXTRA_100"] } })
    const conceptosHoras = Object.fromEntries(conceptos.map((c) => [Number(c.recargo_hora_extra), c]))
    if (!conceptosHoras[50] || !conceptosHoras[100]) {
        throw new ConflictError("Faltan los conceptos comunes HORAS_EXTRA_50 y HORAS_EXTRA_100")
    }

    return await sequelize.transaction(async (transaction) => {
        const resultados = []

        for (const trabajador of trabajadores) {
            resultados.push(await generarParaTrabajador(trabajador, periodo, conceptosHoras, usuarioId, transaction))
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