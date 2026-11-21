// Libro de asistencia: cálculo puro del mes de un trabajador (sin base de datos).
//
// Lo esperado de cada día sale de la jornada del contrato, los feriados que rigen en su comuna y sus licencias.
// En la base solo se guardan las desviaciones (marcas): un día laboral sin marca se trabajó según horario.
//
// Reglas (decididas el 28-10-2026, ver SPEC):
// - Atraso: hasta TOLERANCIA_MINUTOS no se descuenta nada; desde el minuto siguiente se descuentan todos.
// - Salida anticipada: se descuenta desde el primer minuto (sin tolerancia).
// - El atraso se compensa solo el mismo día con el tiempo trabajado después de la hora de salida; la tolerancia
//   se aplica al atraso que queda después de compensar. Llegar antes de la hora de entrada no cuenta.
// - Lo trabajado después de la salida que no compensa un atraso es hora extra. Más de 2 horas extra en el día: advertencia (art. 31).
// - Trabajo en día libre o feriado: todas las horas (menos la colación habitual) se proponen como extra, con advertencia.
// - Solo las marcas aprobadas suman a los totales; las pendientes se calculan y se muestran, pero no suman.
// - Cada marca indica el recargo de sus horas extra: 50 % (por defecto) o 100 % (por trato o contrato). Los totales
//   separan minutos_extra_50 y minutos_extra_100 (16-11-2026: las horas extra del mes solo se registran aquí).

const { diaDelCiclo } = require("../contratos/jornada_legal.js")

const TOLERANCIA_MINUTOS = 5
const MAXIMO_EXTRA_DIARIO = 120
const TIPOS_CON_HORA = ["normal", "atraso"]
const TIPOS_DIA_COMPLETO = ["inasistencia", "permiso_sin_goce", "permiso_con_goce", "vacaciones", "licencia_medica"]

function minutosDe(hora) {
    const coincidencia = /^(\d{2}):(\d{2})/.exec(String(hora ?? ""))
    return coincidencia ? Number(coincidencia[1]) * 60 + Number(coincidencia[2]) : null
}

function diasDelMes(anio, mes) {
    const total = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
    const mm = String(mes).padStart(2, "0")
    return Array.from({ length: total }, (_, i) => `${anio}-${mm}-${String(i + 1).padStart(2, "0")}`)
}

// 1 = lunes … 7 = domingo, igual que la plantilla de jornada.
function diaDeLaSemana(fecha) {
    const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay()
    return dia === 0 ? 7 : dia
}

// La plantilla vigente en una fecha: tramos [{ desde, dias, tipo, ciclo_dias, inicio_ciclo }] (cambios de jornada por
// anexo). Devuelve el tramo, o null si no hay plantilla (tramo sin días).
function jornadaEn(tramos, fecha) {
    const vigentes = (tramos ?? []).filter((t) => t.desde <= fecha).sort((a, b) => a.desde.localeCompare(b.desde))
    const tramo = vigentes.length > 0 ? vigentes[vigentes.length - 1] : null
    return Array.isArray(tramo?.dias) ? tramo : null
}

// Colación más frecuente de la plantilla, para descontarla cuando trabaja un día libre o feriado.
function colacionHabitual(dias) {
    const conteo = new Map()
    for (const d of (dias ?? []).filter((x) => x.trabaja)) {
        conteo.set(Number(d.colacion ?? 0), (conteo.get(Number(d.colacion ?? 0)) ?? 0) + 1)
    }
    return [...conteo].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
}

function enLicencia(licencias, fecha) {
    return (licencias ?? []).some((l) => String(l.fecha_inicio).slice(0, 10) <= fecha && String(l.fecha_termino).slice(0, 10) >= fecha)
}

function esperadoDelDia({ fecha, desde, hasta, tramosJornada, feriados, licencias }) {
    if (fecha < desde || (hasta && fecha > hasta)) {
        return { tipo: "fuera_contrato" }
    }
    if (enLicencia(licencias, fecha)) {
        return { tipo: "licencia" }
    }
    const feriado = (feriados ?? []).find((f) => String(f.fecha).slice(0, 10) === fecha)
    const jornada = jornadaEn(tramosJornada, fecha)
    const dias = jornada?.dias ?? null
    if (feriado) {
        // enJornada: si ese día se trabaja según la jornada (semana corrida: un festivo en un día de descanso
        // convencional, como el sábado en una jornada de lunes a viernes, no se paga). null = sin jornada.
        // En una jornada por ciclo, el día se busca por su posición en el ciclo (paquete T).
        const delDia = jornada === null || jornada.tipo === "art25" ? null : diaDelCiclo(jornada, fecha)
        // Colación: la de ese día si la jornada lo trabaja (un viernes corto sin colación no descuenta nada);
        // si no, la más frecuente de la plantilla, como en un día libre.
        const colacion = delDia?.trabaja ? Number(delDia.colacion ?? 0) : colacionHabitual(dias)
        return { tipo: "feriado", nombre: feriado.nombre, colacion, enJornada: dias === null || jornada?.tipo === "art25" ? null : Boolean(delDia?.trabaja) }
    }
    if (dias === null) {
        return { tipo: "sin_horario" }
    }
    // Art. 25 (paquete V): sin calendario fijo; el trabajo de cada día se registra en los turnos de conducción.
    if (jornada.tipo === "art25") {
        return { tipo: "turnos" }
    }
    const dia = diaDelCiclo(jornada, fecha)
    if (!dia || !dia.trabaja) {
        return { tipo: "libre", colacion: colacionHabitual(dias) }
    }
    const laboral = { tipo: "laboral", entrada: dia.entrada, salida: dia.salida, colacion: Number(dia.colacion ?? 0) }
    // Turno que termina al día siguiente (paquete U).
    return minutosDe(dia.salida) < minutosDe(dia.entrada) ? { ...laboral, cruza: true } : laboral
}

function conTolerancia(minutos) {
    return minutos > TOLERANCIA_MINUTOS ? minutos : 0
}

// Paquete U: turnos que cruzan la medianoche. Las horas se llevan a minutos desde la medianoche del día del turno
// (el día en que empieza): la entrada real se ubica a menos de 12 horas de la entrada esperada (una entrada a las
// 00:15 de un turno de 20:00 es del día siguiente, con atraso) y una salida igual o anterior a la entrada es del día
// siguiente (sale a las 08:30 de un turno de 20:00 a 08:00, o a la 01:00 de un turno de día que se alargó).
function cerca(minutos, referencia) {
    if (minutos < referencia - 720) {
        return minutos + 1440
    }
    if (minutos >= referencia + 720) {
        return minutos - 1440
    }
    return minutos
}

function despuesDe(minutos, entrada) {
    let valor = minutos
    while (valor <= entrada) {
        valor += 1440
    }
    return valor
}

// Minutos de un día laboral con marca de hora. La hora vacía se entiende según horario.
function calcularDiaLaboral(esperado, marca) {
    const entradaEsperada = minutosDe(esperado.entrada)
    const salidaEsperada = despuesDe(minutosDe(esperado.salida), entradaEsperada)
    const entrada = marca.hora_entrada ? cerca(minutosDe(marca.hora_entrada), entradaEsperada) : entradaEsperada
    const salidaMarca = marca.hora_salida ? minutosDe(marca.hora_salida) : null

    if (entrada === null || (marca.hora_salida && salidaMarca === null)) {
        return { error: "Las horas de entrada y salida deben tener el formato HH:MM" }
    }
    if (marca.hora_entrada && marca.hora_salida && minutosDe(marca.hora_entrada) === salidaMarca) {
        return { error: "La entrada y la salida no pueden ser a la misma hora" }
    }
    const salida = salidaMarca === null ? salidaEsperada : despuesDe(salidaMarca, entrada)
    if (salida <= entrada) {
        return { error: "La salida debe ser posterior a la entrada" }
    }

    const atraso = Math.max(0, entrada - entradaEsperada)
    const despues = Math.max(0, salida - salidaEsperada)
    const anticipada = Math.max(0, salidaEsperada - salida)
    const compensado = Math.min(atraso, despues)

    return {
        atraso,
        compensado,
        salidaAnticipada: anticipada,
        minutosDescuento: conTolerancia(atraso - compensado) + anticipada,
        minutosExtra: despues - compensado
    }
}

function calcularLibro({ anio, mes, desde, hasta = null, tramosJornada = [], feriados = [], licencias = [], marcas = [] }) {
    const marcaPorFecha = new Map(marcas.map((m) => [String(m.fecha).slice(0, 10), m]))
    const totales = { minutos_atraso: 0, minutos_extra: 0, minutos_extra_50: 0, minutos_extra_100: 0, dias_inasistencia: 0, dias_permiso_sin_goce: 0, dias_vacaciones: 0, marcas_pendientes: 0 }
    const advertencias = []

    const dias = diasDelMes(anio, mes).map((fecha) => {
        const esperado = esperadoDelDia({ fecha, desde, hasta, tramosJornada, feriados, licencias })
        const marca = marcaPorFecha.get(fecha) ?? null
        const fila = { fecha, diaSemana: diaDeLaSemana(fecha), esperado, marca, minutosDescuento: 0, minutosExtra: 0, recargo: 50, advertencias: [], cuenta: false }

        if (marca === null || marca.estado_aprobacion === "rechazada") {
            return fila
        }

        const aprobada = marca.estado_aprobacion === "aprobada"
        fila.cuenta = aprobada
        if (!aprobada) {
            totales.marcas_pendientes++
        }

        if (esperado.tipo === "fuera_contrato") {
            fila.advertencias.push("Marca fuera del contrato: no se considera")
            fila.cuenta = false
            return fila
        }
        if (esperado.tipo === "licencia") {
            fila.advertencias.push("Marca en un día con licencia médica: no se considera")
            fila.cuenta = false
            return fila
        }

        if (TIPOS_DIA_COMPLETO.includes(marca.tipo)) {
            if (esperado.tipo !== "laboral" && esperado.tipo !== "sin_horario" && esperado.tipo !== "turnos") {
                fila.advertencias.push(`${marca.tipo.replaceAll("_", " ")} en un día ${esperado.tipo === "feriado" ? "feriado" : "libre"}: no se considera`)
                fila.cuenta = false
                return fila
            }
            if (aprobada) {
                if (marca.tipo === "inasistencia") totales.dias_inasistencia++
                if (marca.tipo === "permiso_sin_goce") totales.dias_permiso_sin_goce++
                if (marca.tipo === "vacaciones") totales.dias_vacaciones++
            }
            return fila
        }

        if (!TIPOS_CON_HORA.includes(marca.tipo)) {
            return fila
        }

        if (esperado.tipo === "turnos") {
            fila.advertencias.push("Jornada del art. 25: las horas se registran en Turnos de conducción, no como marca")
            fila.cuenta = false
            return fila
        }
        if (esperado.tipo === "sin_horario") {
            fila.advertencias.push("El contrato no tiene plantilla de jornada: no se calculan atrasos ni horas extra")
            fila.cuenta = false
            return fila
        }

        if (esperado.tipo === "libre" || esperado.tipo === "feriado") {
            const entrada = minutosDe(marca.hora_entrada)
            const salidaMarca = minutosDe(marca.hora_salida)
            if (entrada === null || salidaMarca === null || salidaMarca === entrada) {
                fila.advertencias.push("Trabajo en día libre o feriado: indica la hora de entrada y de salida")
                fila.cuenta = false
                return fila
            }
            // Una salida anterior a la entrada es del día siguiente (paquete U).
            const salida = despuesDe(salidaMarca, entrada)
            fila.minutosExtra = Math.max(0, salida - entrada - esperado.colacion)
            fila.advertencias.push(`Trabajó en día ${esperado.tipo === "feriado" ? "feriado" : "libre"}: todas las horas se proponen como extra; revisar antes de aprobar`)
        } else {
            const calculo = calcularDiaLaboral(esperado, marca)
            if (calculo.error) {
                fila.advertencias.push(calculo.error)
                fila.cuenta = false
                return fila
            }
            Object.assign(fila, calculo)
            if (!esperado.cruza && marca.hora_salida && minutosDe(marca.hora_salida) <= (marca.hora_entrada ? minutosDe(marca.hora_entrada) : minutosDe(esperado.entrada))) {
                fila.advertencias.push("La salida quedó al día siguiente (pasada la medianoche): revisa las horas antes de aprobar")
            }
        }

        fila.recargo = Number(marca.recargo_hora_extra) === 100 ? 100 : 50
        if (fila.minutosExtra > MAXIMO_EXTRA_DIARIO) {
            fila.advertencias.push("Más de 2 horas extra en el día: supera el máximo del art. 31")
        }
        if (aprobada) {
            totales.minutos_atraso += fila.minutosDescuento
            totales.minutos_extra += fila.minutosExtra
            totales[`minutos_extra_${fila.recargo}`] += fila.minutosExtra
        }
        return fila
    })

    if (!tramosJornada.some((t) => Array.isArray(t.dias))) {
        advertencias.push("El contrato no tiene plantilla de jornada: asígnale una (por anexo) para calcular atrasos y horas extra")
    }

    totales.horas_extra = Math.round(totales.minutos_extra / 60 * 100) / 100
    totales.horas_extra_50 = Math.round(totales.minutos_extra_50 / 60 * 100) / 100
    totales.horas_extra_100 = Math.round(totales.minutos_extra_100 / 60 * 100) / 100
    return { dias, totales, advertencias }
}

module.exports = { TOLERANCIA_MINUTOS, calcularLibro, calcularDiaLaboral, esperadoDelDia, jornadaEn, diaDeLaSemana, minutosDe }
