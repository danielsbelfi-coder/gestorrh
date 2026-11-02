// Vacaciones (feriado anual): días hábiles, períodos anuales y saldo. Funciones puras.
// Ver «Módulo de vacaciones, parte 1» en el SPEC.
const { sumarDias } = require("../shared/fechas.js")
const { tiempoServido, diasFeriadoGanados } = require("../remuneraciones/calculo_finiquito.js")

const DIAS_POR_PERIODO = 15
const BLOQUE_MINIMO = 10
const PERIODOS_ACUMULABLES = 2
// Art. 68: con 10 años trabajados, 1 día más por cada 3 años nuevos con el empleador actual; de empleadores
// anteriores se reconocen hasta 10 años.
const ANIOS_BASE_PROGRESIVO = 10
const ANIOS_POR_DIA_PROGRESIVO = 3
const TOPE_ANIOS_PREVIOS = 10

// Días progresivos de un período que se cumple con "aniosActuales" años con el empleador actual.
function diasProgresivos(aniosPrevios, aniosActuales) {
    const total = Math.min(Math.max(0, Number(aniosPrevios) || 0), TOPE_ANIOS_PREVIOS) + aniosActuales
    return total > ANIOS_BASE_PROGRESIVO ? Math.floor((total - ANIOS_BASE_PROGRESIVO) / ANIOS_POR_DIA_PROGRESIVO) : 0
}

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
// aniosPrevios: años con empleadores anteriores (feriado progresivo; se reconocen hasta 10).
function saldoVacaciones({ fechaIngreso, fechaTermino = null, hoy, saldoInicial = null, tomadas = [], aniosPrevios = 0 }) {
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
        const progresivos = diasProgresivos(aniosPrevios, p.numero)
        periodos.push({ tipo: "anual", ...p, progresivos, ganados: cumplido ? DIAS_POR_PERIODO + progresivos : 0, cumplido })
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
    // El proporcional del período en curso incluye sus días progresivos en la misma proporción.
    const proporcional = enCurso
        ? Math.round(diasFeriadoGanados(tiempoServido(enCurso.desde, referencia)) * (DIAS_POR_PERIODO + enCurso.progresivos) / DIAS_POR_PERIODO * 100) / 100
        : 0
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
        enCurso: enCurso ? { numero: enCurso.numero, desde: enCurso.desde, hasta: enCurso.hasta, progresivos: enCurso.progresivos, proporcional } : null,
        aniosPrevios: Math.min(Math.max(0, Number(aniosPrevios) || 0), TOPE_ANIOS_PREVIOS),
        ganados,
        tomados,
        disponible: Math.round((ganados - tomados) * 100) / 100,
        anticipados,
        avisos
    }
}

// Feriado a pagar en el finiquito: pendientes de los períodos + proporcional (0 con art. 44) en días hábiles, más los
// inhábiles (sábados, domingos y feriados) que caen al recorrer esos días desde el siguiente al término.
// saldo: resultado de saldoVacaciones a la fecha del término. feriados: fechas "AAAA-MM-DD".
function feriadoFiniquito({ saldo, fechaTermino, feriados = [], art44 = false }) {
    const pendientes = saldo.disponible
    const proporcional = art44 ? 0 : (saldo.enCurso?.proporcional ?? 0)
    const neto = Math.round((pendientes + proporcional) * 100) / 100
    const habiles = Math.max(0, neto)
    const anticipados = neto < 0 ? -neto : 0

    const festivos = new Set(feriados.map((f) => String(f).slice(0, 10)))
    let inhabiles = 0
    let contados = 0
    let pendientesInhabiles = 0
    const objetivo = Math.ceil(habiles)
    for (let fecha = sumarDias(fechaTermino, 1); contados < objetivo; fecha = sumarDias(fecha, 1)) {
        const dia = diaSemana(fecha)
        if (dia === 0 || dia === 6 || festivos.has(fecha)) {
            pendientesInhabiles++
        } else {
            contados++
            inhabiles += pendientesInhabiles
            pendientesInhabiles = 0
        }
    }

    return {
        pendientes: Math.max(0, pendientes),
        proporcional,
        habiles,
        inhabiles,
        diasPorPagar: Math.round((habiles + inhabiles) * 100) / 100,
        anticipados,
        art44
    }
}

// Art. 71: quien gana variables recibe en vacaciones el promedio de lo variable de los últimos 3 meses liquidados.
const CODIGOS_VARIABLES_ART71 = [2103, 2112, 2113]
const DIAS_MES = 30

// Días corridos de vacaciones aprobadas que caen en el mes (tope 30, mes comercial). vacaciones: [{ desde, hasta }].
function diasCorridosEnMes(vacaciones, anio, mes) {
    const mm = String(mes).padStart(2, "0")
    const primerDia = `${anio}-${mm}-01`
    const ultimoDia = `${anio}-${mm}-${String(new Date(Date.UTC(anio, mes, 0)).getUTCDate()).padStart(2, "0")}`
    let dias = 0
    for (const v of vacaciones) {
        const desde = v.desde > primerDia ? v.desde : primerDia
        const hasta = v.hasta < ultimoDia ? v.hasta : ultimoDia
        if (desde <= hasta) {
            dias += Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000) + 1
        }
    }
    return Math.min(dias, DIAS_MES)
}

// meses: montos por código LRE de las liquidaciones anteriores (máximo 3). → { promedio, dias, monto, meses }.
function remuneracionVariableVacaciones(meses, diasCorridos) {
    const usados = meses.slice(0, 3)
    const suma = (montos) => CODIGOS_VARIABLES_ART71.reduce((total, codigo) => total + Number(montos[codigo] ?? 0), 0)
    const promedio = usados.length === 0 ? 0 : Math.round(usados.reduce((total, montos) => total + suma(montos), 0) / usados.length)
    return { promedio, dias: diasCorridos, monto: Math.round(promedio / DIAS_MES * diasCorridos), meses: usados.length }
}

module.exports = { CODIGOS_VARIABLES_ART71, diasCorridosEnMes, remuneracionVariableVacaciones, feriadoFiniquito, DIAS_POR_PERIODO, TOPE_ANIOS_PREVIOS, diasProgresivos, fechasHabiles, diasHabiles, sumarAnios, periodosAnuales, saldoVacaciones }
