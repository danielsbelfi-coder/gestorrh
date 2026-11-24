// Festivos trabajados según el turno y sus días de descanso compensatorio (art. 38 inc. 3°, paquete AD).
//
// Criterio de Daniel (24-11-2026): en la jornada se elige si el festivo trabajado se compensa con un día de descanso o
// se pagan sus horas con recargo; los días compensatorios que quedan sin dar al término se pagan a un día de sueldo.
// - Ganado: cada festivo de turno trabajado (libro de asistencia) con compensación «descanso».
// - Otorgado: marcas «descanso_compensatorio» aprobadas (pendientes: comprometidas al registrar otra).
const { Op } = require("sequelize")
const { Asistencia, ConceptoRemuneracion } = require("../shared/associations.js")
const { Feriado } = require("../calendario/feriado.model.js")
const { ValidationError, ConflictError } = require("../shared/errors.js")
const { libroDelTrabajador, rangoDelMes } = require("./libro_asistencia.service.js")
const { resumenEntre, saldoAl, disponibleEn } = require("./saldo_compensatorio.js")

const claveDe = (anio, mes) => `${anio}-${String(mes).padStart(2, "0")}`

// Festivos por compensar hasta una fecha: { fecha, minutos: 1 } (un día cada uno, para usar saldo_compensatorio.js).
async function ganadosHasta(trabajador, hasta, transaction) {
    const desde = String(trabajador.fecha_ingreso).slice(0, 10)
    if (hasta < desde) {
        return []
    }
    // Solo los meses con algún feriado (nacional o regional): los demás no pueden tener festivos trabajados.
    const feriados = await Feriado.findAll({ where: { fecha: { [Op.between]: [desde, hasta] } }, attributes: ["fecha"], transaction })
    const meses = [...new Set(feriados.map((f) => String(f.fecha).slice(0, 7)))].sort()
    const ganados = []
    for (const clave of meses) {
        const libro = await libroDelTrabajador(trabajador, Number(clave.slice(0, 4)), Number(clave.slice(5, 7)), transaction, { conSemanas: false })
        for (const fila of libro.dias) {
            if (fila.festivoPorCompensar && fila.fecha <= hasta) {
                ganados.push({ fecha: fila.fecha, minutos: 1 })
            }
        }
    }
    return ganados
}

async function otorgados(trabajador, transaction) {
    const marcas = await Asistencia.findAll({
        where: { trabajador_id: trabajador.id, tipo: "descanso_compensatorio", estado_aprobacion: { [Op.ne]: "rechazada" } },
        attributes: ["id", "fecha", "estado_aprobacion"],
        transaction
    })
    return marcas.map((m) => ({ id: m.id, fecha: String(m.fecha).slice(0, 10), minutos: 1, aprobado: m.estado_aprobacion === "aprobada" }))
}

// Saldo de días del mes para el libro. null si el trabajador nunca tuvo festivos por compensar ni descansos.
async function festivosDelMes(trabajador, anio, mes, tramos = []) {
    const { primerDia, ultimoDia } = rangoDelMes(anio, mes)
    const ganados = await ganadosHasta(trabajador, ultimoDia)
    const marcas = await otorgados(trabajador)
    const conCompensacion = tramos.some((t) => t.festivos === "turno" && t.festivo_compensacion === "descanso")
    if (!conCompensacion && ganados.length === 0 && marcas.length === 0) {
        return null
    }
    const usados = marcas.filter((m) => m.aprobado && m.fecha <= ultimoDia)
    const resumen = resumenEntre({ ganados, usados, desde: primerDia, hasta: ultimoDia })
    return {
        saldoInicial: resumen.saldoInicial,
        ganados: resumen.ganado,
        otorgados: resumen.usado,
        saldoFinal: resumen.saldoFinal,
        pendientes: marcas.filter((m) => !m.aprobado && m.fecha >= primerDia && m.fecha <= ultimoDia).length
    }
}

// Al registrar un descanso compensatorio: tiene que haber un festivo trabajado no compensado hasta esa fecha.
async function exigirFestivoDisponible(trabajador, fecha, idActual = null) {
    const ganados = await ganadosHasta(trabajador, fecha)
    const comprometidos = (await otorgados(trabajador)).filter((m) => m.id !== idActual)
    const disponible = disponibleEn({ ganados, comprometidos, fecha })
    if (disponible < 1) {
        throw new ValidationError(`No hay festivos trabajados por compensar al ${fecha.split("-").reverse().join("-")}: ${ganados.length} trabajado(s) hasta esa fecha y ${comprometidos.length} día(s) de descanso compensatorio ya registrado(s)`)
    }
}

// Línea de la última liquidación: días compensatorios sin dar al término × un día de sueldo.
async function variableFestivosAlTermino(trabajador, periodo, valorDia) {
    const termino = trabajador.fecha_termino ? String(trabajador.fecha_termino).slice(0, 10) : null
    if (termino === null || termino.slice(0, 7) !== claveDe(periodo.anio, periodo.mes)) {
        return { variable: null, avisos: [], detalle: null }
    }
    const ganados = await ganadosHasta(trabajador, termino)
    const marcas = await otorgados(trabajador)
    const dias = saldoAl({ ganados, usados: marcas.filter((m) => m.aprobado), fecha: termino })
    const avisos = []
    const pendientes = marcas.filter((m) => !m.aprobado).length
    if (pendientes > 0) {
        avisos.push(`Hay ${pendientes} día(s) de descanso compensatorio sin aprobar en el libro: no rebajan los festivos que se pagan al término. Apruébalos o recházalos y vuelve a calcular`)
    }
    if (dias <= 0) {
        return { variable: null, avisos, detalle: null }
    }
    const concepto = await ConceptoRemuneracion.findOne({ where: { empresa_id: null, codigo: "FESTIVOS_COMPENSATORIOS" } })
    if (concepto === null) {
        throw new ConflictError("Falta el concepto común FESTIVOS_COMPENSATORIOS")
    }
    const monto = Math.round(dias * valorDia)
    avisos.push(`Término de la relación: se pagan ${dias} festivo(s) trabajado(s) sin día de descanso compensatorio, a un día de sueldo cada uno ($${Math.round(valorDia).toLocaleString("es-CL")})`)
    return {
        variable: { concepto, cantidad: null, monto, fuente: "asistencia", mes_origen: null },
        avisos,
        detalle: { dias, valorDia: Math.round(valorDia * 100) / 100, monto }
    }
}

module.exports = { festivosDelMes, exigirFestivoDisponible, variableFestivosAlTermino }
