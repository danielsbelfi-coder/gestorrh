// Jornada en promedio (art. 22 bis): horas sobre el promedio del ciclo cuando la relación termina a mitad de ciclo.
// Ver promedio_ciclo.js. Las horas se proponen como horas extra al 50 % en el periodo en que se trabajaron:
// - las del mes del periodo, sin mes de origen;
// - en el mes del término, las de un mes anterior que ya está cerrado (o sin periodo) y no se pagaron, con ese mes
//   de origen (sueldo y jornada de ese mes). Si ese mes sigue abierto, se pagan allá al generar su resumen.
const { PeriodoRemuneracion, VariablePeriodo } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { numeroDelCiclo } = require("../contratos/jornada_legal.js")
const { jornadaEn } = require("./libro_asistencia.js")
const { contratoDelMes, tramosDeJornada, libroDelTrabajador, rangoDelMes } = require("./libro_asistencia.service.js")
const { excesoPromedioAlTermino, sumarDias, GLOSA_PROMEDIO } = require("./promedio_ciclo.js")

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

const claveDe = (anio, mes) => `${anio}-${String(mes).padStart(2, "0")}`
const nombreMes = (clave) => `${MESES[Number(clave.slice(5, 7)) - 1]} ${clave.slice(0, 4)}`
const aHoras = (minutos) => Math.round(minutos / 60 * 100) / 100

function mesesEntre(desde, hasta) {
    const meses = []
    for (let clave = desde.slice(0, 7); clave <= hasta.slice(0, 7);) {
        meses.push(clave)
        const [anio, mes] = clave.split("-").map(Number)
        clave = mes === 12 ? claveDe(anio + 1, 1) : claveDe(anio, mes + 1)
    }
    return meses
}

// Cálculo del ciclo en que termina la relación, si toca al mes del periodo. null si no aplica.
async function calculoDelTermino(trabajador, periodo, transaction) {
    const termino = trabajador.fecha_termino ? String(trabajador.fecha_termino).slice(0, 10) : null
    const mesPeriodo = claveDe(periodo.anio, periodo.mes)
    // Un ciclo del 22 bis dura a lo más 4 semanas.
    if (termino === null || termino.slice(0, 7) < mesPeriodo || sumarDias(termino, -27).slice(0, 7) > mesPeriodo) {
        return null
    }
    const { primerDia, ultimoDia } = rangoDelMes(Number(termino.slice(0, 4)), Number(termino.slice(5, 7)))
    const contrato = await contratoDelMes(trabajador.id, primerDia, ultimoDia, transaction)
    if (contrato === null) {
        return null
    }
    const tramos = await tramosDeJornada(contrato, transaction)
    const jornada = jornadaEn(tramos, termino)
    if (jornada === null || jornada.tipo !== "promedio") {
        return null
    }
    const desde = sumarDias(termino, 1 - numeroDelCiclo(jornada, termino))
    const meses = mesesEntre(desde, termino)
    if (!meses.includes(mesPeriodo)) {
        return null
    }
    const dias = []
    for (const clave of meses) {
        const libro = await libroDelTrabajador(trabajador, Number(clave.slice(0, 4)), Number(clave.slice(5, 7)), transaction)
        dias.push(...libro.dias)
    }
    return excesoPromedioAlTermino({ dias, tramos, fechaTermino: termino })
}

// Horas a proponer en el periodo: [{ horas, mes_origen, glosa }] y avisos.
async function horasPromedioDelPeriodo(trabajador, periodo, transaction) {
    const calculo = await calculoDelTermino(trabajador, periodo, transaction)
    if (calculo === null || calculo.minutosExceso === 0) {
        return { calculo, propuestas: [], avisos: [] }
    }
    const mesPeriodo = claveDe(periodo.anio, periodo.mes)
    const detalle = `${GLOSA_PROMEDIO}: ciclo desde el ${calculo.desde.split("-").reverse().join("-")}, ` +
        `${String(aHoras(calculo.minutosTrabajados)).replace(".", ",")} h trabajadas en ${calculo.diasConsiderados} días ` +
        `contra ${String(aHoras(calculo.minutosPromedio)).replace(".", ",")} h del promedio (${String(calculo.promedioSemanalHoras).replace(".", ",")} h semanales)`
    const propuestas = []
    const avisos = []

    if ((calculo.porMes[mesPeriodo] ?? 0) > 0) {
        propuestas.push({ horas: aHoras(calculo.porMes[mesPeriodo]), mes_origen: null, glosa: detalle })
    }

    // Solo en el mes del término: lo de meses anteriores que ya no se puede pagar en su propio periodo.
    if (calculo.hasta.slice(0, 7) === mesPeriodo) {
        for (const [clave, minutos] of Object.entries(calculo.porMes)) {
            if (clave === mesPeriodo || minutos === 0) {
                continue
            }
            const anterior = await PeriodoRemuneracion.findOne({
                where: { empresa_id: periodo.empresa_id, anio: Number(clave.slice(0, 4)), mes: Number(clave.slice(5, 7)) },
                transaction
            })
            if (anterior !== null && anterior.estado === "abierto") {
                avisos.push(`${String(aHoras(minutos)).replace(".", ",")} h sobre el promedio del ciclo (art. 22 bis) se trabajaron en ${nombreMes(clave)}, que sigue abierto: genera el resumen de ese mes para pagarlas allá`)
                continue
            }
            const pagadas = anterior === null ? null : await VariablePeriodo.findOne({
                where: { periodo_id: anterior.id, trabajador_id: trabajador.id, fuente: "asistencia", estado: "aprobada", glosa: { [Op.startsWith]: GLOSA_PROMEDIO } },
                transaction
            })
            if (pagadas === null) {
                propuestas.push({ horas: aHoras(minutos), mes_origen: `${clave}-01`, glosa: `${detalle}; horas de ${nombreMes(clave)}` })
            }
        }
    }
    return { calculo, propuestas, avisos }
}

module.exports = { horasPromedioDelPeriodo, calculoDelTermino }
