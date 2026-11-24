// Jornada en promedio (art. 22 bis, Ley 21.561): cálculos puros sobre los días del libro de asistencia.
//
// 1) Término de la relación a mitad de ciclo (art. 22 bis inc. 3°; Ord. DT 828/49 de 30-12-2025): si trabajó más
//    horas que el promedio del ciclo, calculado en forma proporcional, esas horas se pagan. Criterio de Daniel
//    (24-11-2026): se pagan como horas extra al 50 % (eran las horas sobre el promedio que no cubre el sueldo), sin
//    duplicar las horas extra ya pagadas día a día, y en el periodo en que se trabajaron.
//    - Horas trabajadas: las ordinarias del calendario en los días laborales que trabajó (sin rebajar atrasos, que ya
//      se descontaron aparte, y sin las horas extra del día, que ya se pagaron).
//    - Promedio proporcional: el promedio semanal pactado del ciclo × días considerados / 7.
//    - No se consideran (ni en lo trabajado ni en los días): feriados, licencias, vacaciones, permisos e
//      inasistencias, los días fuera del contrato y los de otra jornada (anexo dentro del ciclo).
// 2) Art. 31: en el 22 bis la jornada ordinaria más la extraordinaria no puede pasar de 52 horas en la semana.

const { diaDelCiclo, numeroDelCiclo, minutosDelTurno } = require("../contratos/jornada_legal.js")
const { jornadaEn, TIPOS_DIA_COMPLETO } = require("./libro_asistencia.js")

const MAXIMO_SEMANAL_22_BIS = 52
const GLOSA_PROMEDIO = "Horas sobre el promedio del ciclo al término (art. 22 bis)"

function sumarDias(fecha, dias) {
    const d = new Date(`${fecha}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dias)
    return d.toISOString().slice(0, 10)
}

function minutosOrdinarios(dia) {
    return minutosDelTurno(dia) - Number(dia.colacion ?? 0)
}

// Promedio semanal pactado del ciclo, en minutos.
function promedioSemanal(jornada) {
    const total = jornada.dias.filter((d) => d.trabaja).reduce((suma, d) => suma + minutosOrdinarios(d), 0)
    return total / (Number(jornada.ciclo_dias) / 7)
}

function ausenciaDelDia(fila) {
    const marca = fila.marca
    return Boolean(marca && marca.estado_aprobacion === "aprobada" && TIPOS_DIA_COMPLETO.includes(marca.tipo))
}

// dias: filas del libro (de uno o más meses) que cubren desde el inicio del ciclo hasta el término.
// Devuelve null si no aplica (otra jornada, ciclo completo o sin días); si no, el detalle y el exceso por mes
// ({ "AAAA-MM": minutos }), asignado primero a los meses anteriores según lo que cada uno excede.
function excesoPromedioAlTermino({ dias, tramos, fechaTermino }) {
    const jornada = jornadaEn(tramos, fechaTermino)
    if (jornada === null || jornada.tipo !== "promedio") {
        return null
    }
    const numero = numeroDelCiclo(jornada, fechaTermino)
    if (numero === Number(jornada.ciclo_dias)) {
        return null
    }
    const desde = sumarDias(fechaTermino, 1 - numero)
    const promedio = promedioSemanal(jornada)
    const porFecha = new Map(dias.map((d) => [d.fecha, d]))

    const meses = new Map()
    let diasConsiderados = 0
    let trabajados = 0
    for (let fecha = desde; fecha <= fechaTermino; fecha = sumarDias(fecha, 1)) {
        const fila = porFecha.get(fecha)
        if (!fila || jornadaEn(tramos, fecha) !== jornada) {
            continue
        }
        const tipo = fila.esperado.tipo
        if (tipo !== "laboral" && tipo !== "libre") {
            continue
        }
        if (tipo === "laboral" && ausenciaDelDia(fila)) {
            continue
        }
        const minutos = tipo === "laboral" ? minutosOrdinarios(diaDelCiclo(jornada, fecha)) : 0
        const mes = fecha.slice(0, 7)
        const acumulado = meses.get(mes) ?? { dias: 0, trabajados: 0 }
        meses.set(mes, { dias: acumulado.dias + 1, trabajados: acumulado.trabajados + minutos })
        diasConsiderados++
        trabajados += minutos
    }
    if (diasConsiderados === 0) {
        return null
    }

    const minutosPromedio = Math.round(promedio * diasConsiderados / 7)
    const exceso = Math.max(0, trabajados - minutosPromedio)
    const porMes = {}
    let restante = exceso
    const claves = [...meses.keys()].sort()
    claves.forEach((mes, i) => {
        const datos = meses.get(mes)
        const propio = i === claves.length - 1
            ? restante
            : Math.min(restante, Math.max(0, datos.trabajados - Math.round(promedio * datos.dias / 7)))
        porMes[mes] = propio
        restante -= propio
    })

    return {
        desde,
        hasta: fechaTermino,
        diaDelCiclo: numero,
        cicloDias: Number(jornada.ciclo_dias),
        diasConsiderados,
        promedioSemanalHoras: Math.round(promedio / 60 * 100) / 100,
        minutosTrabajados: trabajados,
        minutosPromedio,
        minutosExceso: exceso,
        porMes
    }
}

// Minutos trabajados en el día (ordinarios + extra), según el libro. Una marca pendiente no cambia lo esperado.
function minutosDelDia(fila, jornada) {
    const tipo = fila.esperado.tipo
    const cuenta = fila.marca === null || fila.cuenta
    if (tipo === "laboral") {
        if (ausenciaDelDia(fila)) {
            return 0
        }
        const ordinarios = minutosOrdinarios(diaDelCiclo(jornada, fila.fecha))
        return cuenta ? ordinarios - (fila.minutosDescuento ?? 0) + (fila.minutosExtra ?? 0) : ordinarios
    }
    if ((tipo === "libre" || tipo === "feriado") && fila.cuenta) {
        return fila.minutosExtra ?? 0
    }
    return 0
}

function textoFecha(fecha) {
    return `${fecha.slice(8, 10)}-${fecha.slice(5, 7)}`
}

// Semanas (lunes a domingo) que terminan entre desde y hasta con más de 52 h entre ordinarias y extra en una jornada
// en promedio. dias debe incluir los días previos de la primera semana (del mes anterior).
function semanasSobreMaximo({ dias, tramos, desde, hasta }) {
    const porFecha = new Map(dias.map((d) => [d.fecha, d]))
    const avisos = []
    for (let domingo = desde; domingo <= hasta; domingo = sumarDias(domingo, 1)) {
        if (new Date(`${domingo}T00:00:00Z`).getUTCDay() !== 0) {
            continue
        }
        const lunes = sumarDias(domingo, -6)
        let minutos = 0
        let enPromedio = false
        for (let fecha = lunes; fecha <= domingo; fecha = sumarDias(fecha, 1)) {
            const jornada = jornadaEn(tramos, fecha)
            const fila = porFecha.get(fecha)
            if (jornada === null || jornada.tipo !== "promedio" || !fila) {
                continue
            }
            enPromedio = true
            minutos += minutosDelDia(fila, jornada)
        }
        if (enPromedio && minutos > MAXIMO_SEMANAL_22_BIS * 60) {
            const horas = String(Math.round(minutos / 60 * 100) / 100).replace(".", ",")
            avisos.push(`Semana del ${textoFecha(lunes)} al ${textoFecha(domingo)}: ${horas} h entre jornada ordinaria y extra; en la jornada en promedio (art. 22 bis) no puede pasar de ${MAXIMO_SEMANAL_22_BIS} h (art. 31)`)
        }
    }
    return avisos
}

module.exports = { MAXIMO_SEMANAL_22_BIS, GLOSA_PROMEDIO, excesoPromedioAlTermino, semanasSobreMaximo, sumarDias }
