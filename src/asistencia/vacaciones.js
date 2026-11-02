// Vacaciones (feriado anual): días hábiles, períodos anuales y saldo. Funciones puras.
// Ver «Módulo de vacaciones, parte 1» en el SPEC.
const { sumarDias } = require("../shared/fechas.js")
const { tiempoServido, diasFeriadoGanados } = require("../remuneraciones/calculo_finiquito.js")

const DIAS_POR_PERIODO = 15
const BLOQUE_MINIMO = 10
const PERIODOS_ACUMULABLES = 2

const diaSemana = (fecha) => new Date(`${fecha}T00:00:00Z`).getUTCDay()

// Días hábiles para el feriado (art. 69): lunes a viernes que no son feriado. feriados: fechas "AAAA-MM-DD".
function fechasHabiles(desde, hasta, feriados = []) {
    const festivos = new Set(feriados.map((f) => String(f).slice(0, 10)))
    const fechas = []
    for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
        const dia = diaSemana(fecha)
        if (dia !== 0 && dia !== 6 && !festivos.has(fecha)) {
            fechas.push(fecha)
        }
    }
    return fechas
}

function diasHabiles(desde, hasta, feriados = []) {
    return fechasHabiles(desde, hasta, feriados).length
}

// La misma fecha "anios" años después (el 29 de febrero pasa al 28 si el año no es bisiesto).
function sumarAnios(fecha, anios) {
    const anio = Number(fecha.slice(0, 4)) + anios
    const mes = fecha.slice(5, 7)
    const ultimo = new Date(Date.UTC(anio, Number(mes), 0)).getUTCDate()
    const dia = Math.min(Number(fecha.slice(8, 10)), ultimo)
    return `${anio}-${mes}-${String(dia).padStart(2, "0")}`
}

// Períodos anuales de la relación desde el ingreso, mientras empiecen a más tardar en "hasta".
function periodosAnuales(fechaIngreso, hasta) {
    const periodos = []
    for (let numero = 1; ; numero++) {
        const desde = sumarAnios(fechaIngreso, numero - 1)
        if (desde > hasta) {
            break
        }
        periodos.push({ numero, desde, hasta: sumarDias(sumarAnios(fechaIngreso, numero), -1) })
    }
    return periodos
}

// fechaIngreso, fechaTermino (o null), hoy: "AAAA-MM-DD". saldoInicial: { fecha_corte, dias } o null.
// tomadas: vacaciones aprobadas [{ id, desde, dias }].
function saldoVacaciones({ fechaIngreso, fechaTermino = null, hoy, saldoInicial = null, tomadas = [] }) {
    const referencia = fechaTermino && fechaTermino < hoy ? fechaTermino : hoy
    const anuales = periodosAnuales(fechaIngreso, referencia)
    const corte = saldoInicial?.fecha_corte ?? null

    // Un período se gana al cumplirse (al día siguiente de su último día).
    const periodos = []
    if (corte) {
        periodos.push({ tipo: "inicial", numero: null, desde: null, hasta: corte, ganados: Number(saldoInicial.dias), cumplido: true })
    }
    for (const p of anuales) {
        if (corte && p.hasta <= corte) {
            continue
        }
        const cumplido = p.hasta < referencia
        periodos.push({ tipo: "anual", ...p, ganados: cumplido ? DIAS_POR_PERIODO : 0, cumplido })
    }
    for (const p of periodos) {
        Object.assign(p, { tomados: 0, imputaciones: [] })
    }

    // Lo tomado se imputa al período cumplido más antiguo con saldo; lo que no alcanza queda como anticipado.
    const cumplidos = periodos.filter((p) => p.cumplido)
    let anticipados = 0
    for (const vacacion of [...tomadas].sort((a, b) => a.desde.localeCompare(b.desde))) {
        let resto = Number(vacacion.dias)
        for (const p of cumplidos) {
            const libre = p.ganados - p.tomados
            if (resto <= 0 || libre <= 0) {
                continue
            }
            const parte = Math.min(libre, resto)
            p.tomados += parte
            p.imputaciones.push({ vacacion_id: vacacion.id, dias: parte, total: Number(vacacion.dias) })
            resto -= parte
        }
        anticipados += resto
    }
    for (const p of periodos) {
        p.pendientes = Math.round((p.ganados - p.tomados) * 100) / 100
    }

    const enCurso = periodos.find((p) => p.tipo === "anual" && !p.cumplido) ?? null
    const proporcional = enCurso ? diasFeriadoGanados(tiempoServido(enCurso.desde, referencia)) : 0
    const ganados = cumplidos.reduce((suma, p) => suma + p.ganados, 0)
    const tomados = tomadas.reduce((suma, v) => suma + Number(v.dias), 0)

    const avisos = []
    const acumulados = cumplidos.filter((p) => p.pendientes > 0)
    if (acumulados.length > PERIODOS_ACUMULABLES) {
        avisos.push(`Acumula ${acumulados.length} períodos con días pendientes; la ley permite acumular hasta dos (art. 70 del Código del Trabajo)`)
    }
    for (const p of cumplidos.filter((x) => x.tipo === "anual" && x.pendientes === 0 && x.tomados > 0)) {
        if (!p.imputaciones.some((i) => i.total >= BLOQUE_MINIMO)) {
            avisos.push(`El período ${p.numero} se usó sin un bloque de al menos ${BLOQUE_MINIMO} días hábiles seguidos (art. 70)`)
        }
    }
    if (anticipados > 0) {
        avisos.push(`Tiene ${anticipados} día(s) de vacaciones anticipadas: se descuentan de lo que gane después`)
    }

    return {
        referencia,
        periodos,
        enCurso: enCurso ? { numero: enCurso.numero, desde: enCurso.desde, hasta: enCurso.hasta, proporcional } : null,
        ganados,
        tomados,
        disponible: Math.round((ganados - tomados) * 100) / 100,
        anticipados,
        avisos
    }
}

module.exports = { DIAS_POR_PERIODO, fechasHabiles, diasHabiles, sumarAnios, periodosAnuales, saldoVacaciones }
