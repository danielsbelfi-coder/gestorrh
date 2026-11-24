// Saldo de tiempo compensatorio y descansos compensatorios otorgados (art. 25, paquete AC). Ver saldo_compensatorio.js.
const { Op } = require("sequelize")
const { TurnoConduccion, DescansoCompensatorio, ConceptoRemuneracion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { esFechaValida } = require("../shared/fechas.js")
const { rangoDelMes } = require("./libro_asistencia.service.js")
const { resumenTurnos } = require("./calculo_turnos.js")
const { saldoAl, resumenEntre, disponibleEn } = require("./saldo_compensatorio.js")
const turnos = require("./turno_conduccion.service.js")

const textoHoras = (minutos) => `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, "0")} h`

// Minutos compensatorios ganados (turnos aprobados y sin errores hasta una fecha) y descansos registrados.
async function movimientos(trabajador, hasta) {
    const lista = await TurnoConduccion.findAll({ where: { trabajador_id: trabajador.id, fecha: { [Op.lte]: hasta } }, order: [["fecha", "ASC"], ["hora_inicio", "ASC"]] })
    const tipos = await turnos.mapaDeTipos(trabajador.empresa_id)
    const { filas } = resumenTurnos({ turnos: lista.map((t) => t.toJSON()), tipos, topeHoras: 0, anterior: null })
    const ganados = filas
        .filter((f) => f.turno.estado_aprobacion === "aprobado" && f.calculo.errores.length === 0 && f.calculo.minutosCompensatorios > 0)
        .map((f) => ({ fecha: String(f.turno.fecha).slice(0, 10), minutos: f.calculo.minutosCompensatorios }))
    const descansos = (await DescansoCompensatorio.findAll({ where: { trabajador_id: trabajador.id }, order: [["fecha", "ASC"], ["id", "ASC"]] }))
        .map((d) => d.toJSON())
    const usados = descansos.filter((d) => d.estado_aprobacion === "aprobado").map((d) => ({ fecha: String(d.fecha).slice(0, 10), minutos: d.minutos }))
    return { ganados, usados, descansos }
}

// Saldo del mes para la pantalla de turnos: inicial, ganado, usado, final, pendientes y los descansos del mes.
async function compensatorioDelMes(trabajador, anio, mes) {
    const { primerDia, ultimoDia } = rangoDelMes(anio, mes)
    const { ganados, usados, descansos } = await movimientos(trabajador, ultimoDia)
    const resumen = resumenEntre({ ganados, usados, desde: primerDia, hasta: ultimoDia })
    const delMes = descansos.filter((d) => d.fecha >= primerDia && d.fecha <= ultimoDia)
    const avisos = []
    if (resumen.saldoFinal < 0) {
        avisos.push(`El saldo quedó negativo (${textoHoras(-resumen.saldoFinal)}): se otorgó más descanso del que generaron los turnos aprobados. Revisa los turnos o los descansos`)
    }
    return {
        ...resumen,
        pendientes: delMes.filter((d) => d.estado_aprobacion === "pendiente").reduce((s, d) => s + d.minutos, 0),
        descansos: delMes,
        avisos
    }
}

// Saldo aprobado al término de la relación, si el término cae en el mes del periodo. null si no corresponde.
async function saldoAlTermino(trabajador, anio, mes) {
    const termino = trabajador.fecha_termino ? String(trabajador.fecha_termino).slice(0, 10) : null
    const { primerDia, ultimoDia } = rangoDelMes(anio, mes)
    if (termino === null || termino < primerDia || termino > ultimoDia) {
        return null
    }
    const { ganados, usados, descansos } = await movimientos(trabajador, termino)
    return {
        fecha: termino,
        minutos: saldoAl({ ganados, usados, fecha: termino }),
        pendientes: descansos.filter((d) => d.estado_aprobacion === "pendiente").length
    }
}

// Línea de la última liquidación con el saldo sin usar, al valor hora de la liquidación. Devuelve la variable a sumar
// (o null) y los avisos.
async function variableSaldoAlTermino(trabajador, periodo, valorHora) {
    const saldo = await saldoAlTermino(trabajador, periodo.anio, periodo.mes)
    if (saldo === null || (saldo.minutos <= 0 && saldo.pendientes === 0)) {
        return { variable: null, avisos: [], detalle: null }
    }
    const avisos = []
    if (saldo.pendientes > 0) {
        avisos.push(`Hay ${saldo.pendientes} descanso(s) compensatorio(s) sin aprobar: no rebajan el saldo que se paga al término. Apruébalos o elimínalos en Turnos de conducción y vuelve a calcular`)
    }
    if (saldo.minutos <= 0) {
        return { variable: null, avisos, detalle: null }
    }
    const concepto = await ConceptoRemuneracion.findOne({ where: { empresa_id: null, codigo: "SALDO_COMPENSATORIO" } })
    if (concepto === null) {
        throw new ConflictError("Falta el concepto común SALDO_COMPENSATORIO")
    }
    const monto = Math.round(saldo.minutos / 60 * valorHora)
    avisos.push(`Término de la relación: se pagan ${textoHoras(saldo.minutos)} de saldo de tiempo compensatorio sin usar, al valor hora de la liquidación ($${Math.round(valorHora).toLocaleString("es-CL")})`)
    return {
        variable: { concepto, cantidad: null, monto, fuente: "turnos", mes_origen: null },
        avisos,
        detalle: { minutos: saldo.minutos, valorHora: Math.round(valorHora * 100) / 100, monto }
    }
}

function leerMinutos(entrada) {
    if (entrada?.minutos !== undefined && entrada?.minutos !== null && entrada?.minutos !== "") {
        return Number(entrada.minutos)
    }
    const coincidencia = /^(\d{1,2}):([0-5]\d)$/.exec(String(entrada?.horas ?? "").trim())
    return coincidencia ? Number(coincidencia[1]) * 60 + Number(coincidencia[2]) : NaN
}

async function descansoPermitido(id, empresasPermitidas) {
    const descanso = await DescansoCompensatorio.findByPk(id)
    if (descanso === null) {
        throw new NotFoundError("Descanso no encontrado")
    }
    const trabajador = await turnos.trabajadorPermitido(descanso.trabajador_id, empresasPermitidas).catch(() => {
        throw new NotFoundError("Descanso no encontrado")
    })
    return { descanso, trabajador }
}

async function exigirDisponible(trabajador, fecha, minutos, excluirId = null) {
    const { ganados, descansos } = await movimientos(trabajador, fecha)
    const comprometidos = descansos.filter((d) => d.id !== excluirId).map((d) => ({ fecha: String(d.fecha).slice(0, 10), minutos: d.minutos }))
    const disponible = disponibleEn({ ganados, comprometidos, fecha })
    if (minutos > disponible) {
        throw new ValidationError(`El saldo disponible al ${fecha.split("-").reverse().join("-")} es ${textoHoras(Math.max(0, disponible))} (lo ganado con turnos aprobados hasta esa fecha, menos los descansos ya registrados)`)
    }
}

// Registra un descanso compensatorio (queda pendiente de aprobación).
async function registrarDescanso(entrada, empresasPermitidas, usuarioId) {
    const trabajador = await turnos.trabajadorPermitido(Number(entrada?.trabajador_id), empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)
    const fecha = String(entrada?.fecha ?? "").slice(0, 10)
    if (!esFechaValida(fecha)) {
        throw new ValidationError("Indica la fecha del descanso")
    }
    const minutos = leerMinutos(entrada)
    if (!Number.isInteger(minutos) || minutos < 1 || minutos > 1440) {
        throw new ValidationError("Indica las horas del descanso (HH:MM, hasta 24:00)")
    }
    if (fecha < String(trabajador.fecha_ingreso).slice(0, 10) || (trabajador.fecha_termino && fecha > String(trabajador.fecha_termino).slice(0, 10))) {
        throw new ValidationError("La fecha está fuera de la relación laboral")
    }
    await turnos.exigirPeriodoAbierto(trabajador.empresa_id, fecha)
    await exigirDisponible(trabajador, fecha, minutos)
    return await DescansoCompensatorio.create({
        trabajador_id: trabajador.id,
        fecha,
        minutos,
        observaciones: String(entrada?.observaciones ?? "").trim().slice(0, 300) || null,
        estado_aprobacion: "pendiente",
        usuario_registro_id: usuarioId
    })
}

async function aprobarDescanso(id, empresasPermitidas, usuarioId) {
    const { descanso, trabajador } = await descansoPermitido(id, empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.APROBAR_ASISTENCIA)
    await turnos.exigirPeriodoAbierto(trabajador.empresa_id, String(descanso.fecha))
    await exigirDisponible(trabajador, String(descanso.fecha).slice(0, 10), descanso.minutos, descanso.id)
    return await descanso.update({ estado_aprobacion: "aprobado", aprobado_por_id: usuarioId })
}

async function eliminarDescanso(id, empresasPermitidas, usuarioId) {
    const { descanso, trabajador } = await descansoPermitido(id, empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)
    await turnos.exigirPeriodoAbierto(trabajador.empresa_id, String(descanso.fecha))
    await descanso.destroy()
}

module.exports = { compensatorioDelMes, saldoAlTermino, variableSaldoAlTermino, registrarDescanso, aprobarDescanso, eliminarDescanso }
