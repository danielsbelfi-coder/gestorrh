// Turnos de conducción del art. 25 (choferes y auxiliares de la locomoción colectiva interurbana). Funciones puras.
// Ver «Paquete V» en el SPEC.
//
// Un turno tiene marcaciones de inicio y fin (HH:MM) y una lista de pausas (esperas o descansos) con su tipo de espera.
// - El turno entero se imputa a la fecha en que empieza, aunque cruce la medianoche (criterio confirmado el 21-11-2026).
// - Jornada del turno = fin − inicio − pausas de tipos no imputables. Las pausas de tipos imputables (a disposición,
//   aduana, retraso operativo…) siguen siendo jornada.
// - Pago de una pausa no imputable según su tipo: minutos pagables = minutos − minutos sin pago, redondeados hacia
//   arriba al múltiplo configurado (la fracción iniciada se paga); por hora: pagables / 60 × valor; monto fijo: el
//   valor si hay minutos pagables. Con compensación «descanso» no se paga: los minutos pagables se acumulan como
//   tiempo compensatorio.
// - Alertas del art. 25: más de 5 horas de conducción continua sin un descanso de 2 horas; menos de 8 horas de descanso
//   desde el turno anterior; turno de más de 16 horas sin un descanso de 8 horas.

const MAXIMO_CONTINUO = 300
const DESCANSO_CONTINUO = 120
const DESCANSO_DIARIO = 480
const CLASES_DESCANSO = ["descanso_bordo", "descanso_tierra"]

function minutosDe(hora) {
    const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hora ?? "").slice(0, 5))
    return coincidencia ? Number(coincidencia[1]) * 60 + Number(coincidencia[2]) : null
}

// Primer valor equivalente (sumando días) que sea mayor que el límite (o igual, si se permite).
function despuesDe(minutos, limite, igualPermitido = false) {
    let valor = minutos
    while (igualPermitido ? valor < limite : valor <= limite) {
        valor += 1440
    }
    return valor
}

function horasTexto(minutos) {
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return m ? `${h} h ${m} min` : `${h} h`
}

// Minutos desde una fecha fija (para comparar turnos de días distintos).
function minutosAbsolutos(fecha, minutosDelDia) {
    return Date.parse(`${String(fecha).slice(0, 10)}T00:00:00Z`) / 60000 + minutosDelDia
}

function redondearArriba(minutos, paso) {
    const p = Number(paso) > 1 ? Number(paso) : 1
    return Math.ceil(minutos / p) * p
}

// Pago o compensación de una pausa no imputable según su tipo.
function valorizarPausa(minutos, tipo) {
    if (tipo.imputable) {
        return { pagables: 0, monto: 0, compensatorios: 0 }
    }
    const netos = Math.max(0, minutos - Number(tipo.minutos_sin_pago ?? 0))
    const redondeados = netos > 0 ? redondearArriba(netos, tipo.redondeo_minutos) : 0
    if (tipo.compensacion === "descanso") {
        return { pagables: 0, monto: 0, compensatorios: redondeados }
    }
    if (tipo.pago === "por_hora") {
        return { pagables: redondeados, monto: Math.round(redondeados / 60 * Number(tipo.valor ?? 0)), compensatorios: 0 }
    }
    if (tipo.pago === "monto_fijo") {
        return { pagables: redondeados, monto: redondeados > 0 ? Number(tipo.valor ?? 0) : 0, compensatorios: 0 }
    }
    return { pagables: 0, monto: 0, compensatorios: 0 }
}

// Calcula un turno. tipos: Map id → tipo de espera.
// Devuelve { inicio, fin (minutos desde la medianoche del día del turno), minutosTotales, minutosJornada,
// minutosNoImputables, pausas (con detalle), monto, minutosCompensatorios, errores, alertas }.
function calcularTurno(turno, tipos) {
    const errores = []
    const alertas = []
    const inicio = minutosDe(turno.hora_inicio)
    const finMarca = minutosDe(turno.hora_fin)
    const vacio = { inicio, fin: null, minutosTotales: 0, minutosJornada: 0, minutosNoImputables: 0, pausas: [], monto: 0, minutosCompensatorios: 0, errores, alertas }

    if (inicio === null || finMarca === null) {
        errores.push("Indica la hora de inicio y de fin del turno (HH:MM)")
        return vacio
    }
    if (inicio === finMarca) {
        errores.push("El inicio y el fin del turno no pueden ser a la misma hora")
        return vacio
    }
    const fin = despuesDe(finMarca, inicio)

    const pausas = []
    for (const [i, p] of (Array.isArray(turno.pausas) ? turno.pausas : []).entries()) {
        const numero = i + 1
        const tipo = tipos.get(Number(p.tipo_espera_id))
        const desde = minutosDe(p.inicio)
        const hasta = minutosDe(p.fin)
        if (!tipo) {
            errores.push(`Pausa ${numero}: elige un tipo de espera de la empresa`)
            continue
        }
        if (desde === null || hasta === null || desde === hasta) {
            errores.push(`Pausa ${numero}: indica inicio y fin distintos (HH:MM)`)
            continue
        }
        const pInicio = despuesDe(desde, inicio, true)
        const pFin = despuesDe(hasta, pInicio)
        if (pFin > fin) {
            errores.push(`Pausa ${numero}: debe quedar dentro del turno`)
            continue
        }
        const minutos = pFin - pInicio
        pausas.push({
            numero,
            tipo_espera_id: tipo.id,
            tipo: tipo.nombre,
            clase: tipo.clase,
            imputable: tipo.imputable === true,
            inicio: pInicio,
            fin: pFin,
            minutos,
            lugar: p.lugar ?? null,
            causa: p.causa ?? null,
            ...valorizarPausa(minutos, tipo)
        })
    }

    pausas.sort((a, b) => a.inicio - b.inicio)
    for (let i = 1; i < pausas.length; i++) {
        if (pausas[i].inicio < pausas[i - 1].fin) {
            errores.push(`Las pausas ${pausas[i - 1].numero} y ${pausas[i].numero} se superponen`)
        }
    }

    const minutosTotales = fin - inicio
    const minutosNoImputables = pausas.filter((p) => !p.imputable).reduce((s, p) => s + p.minutos, 0)
    const minutosJornada = minutosTotales - minutosNoImputables

    // Conducción continua: el tiempo fuera de pausas se acumula; un descanso (o una espera no imputable) de 2 horas o
    // más reinicia la cuenta. Las pausas más cortas o imputables no suman conducción, pero tampoco reinician.
    let continuo = 0
    let maximoContinuo = 0
    let cursor = inicio
    for (const p of pausas) {
        continuo += Math.max(0, p.inicio - cursor)
        maximoContinuo = Math.max(maximoContinuo, continuo)
        const reinicia = p.minutos >= DESCANSO_CONTINUO && (!p.imputable || CLASES_DESCANSO.includes(p.clase))
        if (reinicia) {
            continuo = 0
        }
        cursor = Math.max(cursor, p.fin)
    }
    continuo += Math.max(0, fin - cursor)
    maximoContinuo = Math.max(maximoContinuo, continuo)
    if (maximoContinuo > MAXIMO_CONTINUO) {
        alertas.push(`${horasTexto(maximoContinuo)} de conducción continua: el art. 25 permite hasta 5 horas, seguidas de un descanso de al menos 2 horas`)
    }

    const descansoLargo = pausas.some((p) => !p.imputable && p.minutos >= DESCANSO_DIARIO)
    if (minutosTotales > 1440 - DESCANSO_DIARIO && !descansoLargo) {
        alertas.push(`Turno de ${horasTexto(minutosTotales)} sin un descanso de 8 horas: el art. 25 exige 8 horas ininterrumpidas en cada 24`)
    }

    return {
        inicio,
        fin,
        minutosTotales,
        minutosJornada,
        minutosNoImputables,
        pausas,
        monto: pausas.reduce((s, p) => s + p.monto, 0),
        minutosCompensatorios: pausas.reduce((s, p) => s + p.compensatorios, 0),
        errores,
        alertas
    }
}

// Tope de horas del mes: completo si el contrato cubre todo el mes; si entra o sale en el mes, proporcional a los días
// del contrato sobre los días del mes.
function topeDelMes(horasMensuales, diasContrato, diasDelMes) {
    const proporcion = diasContrato >= diasDelMes ? 1 : diasContrato / diasDelMes
    return Math.round(Number(horasMensuales) * proporcion * 100) / 100
}

// Calcula los turnos de un trabajador en el mes, con las alertas entre turnos, y el resumen.
// turnos: [{ id, fecha, hora_inicio, hora_fin, pausas, estado_aprobacion }]; anterior: el último turno antes del mes
// (para revisar el descanso con el primero); topeHoras: tope del mes en horas.
// El resumen suma solo los turnos aprobados.
function resumenTurnos({ turnos, tipos, topeHoras, anterior = null }) {
    const ordenados = [...turnos].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || minutosDe(a.hora_inicio) - minutosDe(b.hora_inicio))
    let previo = anterior ? { turno: anterior, calculo: calcularTurno(anterior, tipos) } : null
    const filas = ordenados.map((turno) => {
        const calculo = calcularTurno(turno, tipos)
        if (previo && calculo.errores.length === 0 && previo.calculo.errores.length === 0) {
            const finPrevio = minutosAbsolutos(previo.turno.fecha, previo.calculo.fin)
            const inicioActual = minutosAbsolutos(turno.fecha, calculo.inicio)
            const descanso = inicioActual - finPrevio
            if (descanso < 0) {
                calculo.errores.push("Se superpone con el turno anterior")
            } else if (descanso < DESCANSO_DIARIO) {
                const enRuta = previo.calculo.minutosJornada >= DESCANSO_DIARIO ? " (después de 8 o más horas de trabajo en ruta corresponden 8 horas de descanso en tierra)" : ""
                calculo.alertas.push(`Solo ${horasTexto(descanso)} de descanso desde el turno anterior: el art. 25 exige 8 horas ininterrumpidas en cada 24${enRuta}`)
            }
        }
        if (calculo.errores.length === 0) {
            previo = { turno, calculo }
        }
        return { turno, calculo }
    })

    const aprobados = filas.filter((f) => f.turno.estado_aprobacion === "aprobado" && f.calculo.errores.length === 0)
    const minutosJornada = aprobados.reduce((s, f) => s + f.calculo.minutosJornada, 0)
    const topeMinutos = Math.round(Number(topeHoras) * 60)
    const porTipo = new Map()
    for (const f of aprobados) {
        for (const p of f.calculo.pausas) {
            const acumulado = porTipo.get(p.tipo_espera_id) ?? { tipo_espera_id: p.tipo_espera_id, tipo: p.tipo, imputable: p.imputable, cantidad: 0, minutos: 0, pagables: 0, monto: 0, compensatorios: 0 }
            acumulado.cantidad++
            acumulado.minutos += p.minutos
            acumulado.pagables += p.pagables
            acumulado.monto += p.monto
            acumulado.compensatorios += p.compensatorios
            porTipo.set(p.tipo_espera_id, acumulado)
        }
    }

    return {
        filas,
        resumen: {
            turnos: filas.length,
            aprobados: aprobados.length,
            pendientes: filas.filter((f) => f.turno.estado_aprobacion !== "aprobado").length,
            conErrores: filas.filter((f) => f.calculo.errores.length > 0).length,
            alertas: filas.reduce((s, f) => s + f.calculo.alertas.length, 0),
            minutosJornada,
            topeHoras: Number(topeHoras),
            minutosSobreTope: Math.max(0, minutosJornada - topeMinutos),
            esperas: [...porTipo.values()],
            montoEsperas: aprobados.reduce((s, f) => s + f.calculo.monto, 0),
            minutosCompensatorios: aprobados.reduce((s, f) => s + f.calculo.minutosCompensatorios, 0)
        }
    }
}

module.exports = { calcularTurno, resumenTurnos, topeDelMes, valorizarPausa, minutosDe }
