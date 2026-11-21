// Reglas legales de la jornada (función pura, sin base de datos).
// Una jornada guarda los días de su ciclo: { dia: 1..N, trabaja, entrada "HH:MM", salida "HH:MM", colacion: minutos }.
// Semanal: N = 7, del lunes (1) al domingo (7). Por ciclo (art. 22 bis, 39 y 38 inc. 7): el día 1 es inicio_ciclo.

const NOMBRES_DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

// Ley 21.561 (40 horas): 44 h hasta el 25-04-2026, 42 h desde el 26-04-2026 y 40 h desde el 26-04-2028.
function maximoSemanal(fecha) {
    if (fecha >= "2028-04-26") {
        return 40
    }
    if (fecha >= "2026-04-26") {
        return 42
    }
    return 44
}

const MAXIMO_DIARIO = 10
const DIAS_MINIMOS = 4
const DIAS_MAXIMOS = 6
const COLACION_MINIMA = 30

function minutosDe(hora) {
    const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hora ?? ""))
    return coincidencia ? Number(coincidencia[1]) * 60 + Number(coincidencia[2]) : null
}

function redondear(horas) {
    return Math.round(horas * 100) / 100
}

// Horas ordinarias de un día (salida − entrada − colación). Supone entrada y salida en el mismo día.
// Paquete U: un turno cuya salida es anterior a su entrada termina al día siguiente (20:00 a 8:00). El turno pertenece
// al día en que empieza.
function cruzaMedianoche(dia) {
    const desde = minutosDe(dia?.entrada)
    const hasta = minutosDe(dia?.salida)
    return desde !== null && hasta !== null && hasta < desde
}

// Minutos entre la entrada y la salida del turno (sumando 24 h si cruza la medianoche).
function minutosDelTurno(dia) {
    const desde = minutosDe(dia.entrada)
    const hasta = minutosDe(dia.salida)
    return hasta - desde + (hasta < desde ? 1440 : 0)
}

function horasDelDia(dia) {
    if (!dia?.trabaja) {
        return 0
    }
    return redondear((minutosDelTurno(dia) - Number(dia.colacion ?? 0)) / 60)
}

const TIPOS = ["semanal", "promedio", "bisemanal", "excepcional", "art25"]
// Art. 25 (choferes y auxiliares de la locomoción colectiva interurbana): 180 horas mensuales hasta el 25-04-2028;
// desde el 26-04-2028, 40 horas semanales promedio en cómputo mensual (Ley 21.561, se puede pactar antes).
const HORAS_MENSUALES_ART25 = 180
const INICIO_40_HORAS_ART25 = "2028-04-26"
const CICLOS_PROMEDIO = [14, 21, 28]
const MAXIMO_SEMANA_PROMEDIO = 45
const MAXIMO_DIARIO_EXCEPCIONAL = 12
const MAXIMO_CONTINUO_BISEMANAL = 14
const CICLO_MAXIMO = 56
// Un lunes: en la jornada semanal el día 1 del ciclo es el lunes.
const LUNES_REFERENCIA = "2024-01-01"

function diasEntre(desde, hasta) {
    return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000)
}

function esFecha(texto) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(texto ?? "")) && !Number.isNaN(Date.parse(`${texto}T00:00:00Z`))
}

function sumarAnios(fecha, anios) {
    return `${Number(fecha.slice(0, 4)) + anios}${fecha.slice(4)}`
}

// Número del día del ciclo (1..ciclo_dias) que corresponde a una fecha. Semanal: 1 = lunes … 7 = domingo.
function numeroDelCiclo(jornada, fecha) {
    const ciclo = Number(jornada?.ciclo_dias ?? 7) || 7
    const inicio = jornada?.tipo && jornada.tipo !== "semanal" && jornada.inicio_ciclo ? String(jornada.inicio_ciclo).slice(0, 10) : LUNES_REFERENCIA
    const desplazamiento = diasEntre(inicio, fecha)
    return ((desplazamiento % ciclo) + ciclo) % ciclo + 1
}

// El día de la plantilla que corresponde a una fecha (null si la jornada no tiene días).
function diaDelCiclo(jornada, fecha) {
    if (!Array.isArray(jornada?.dias)) {
        return null
    }
    const numero = numeroDelCiclo(jornada, fecha)
    return jornada.dias.find((d) => Number(d.dia) === numero) ?? null
}

function nombreDelDia(tipo, numero) {
    return tipo === "semanal" ? `El ${NOMBRES_DIA[numero - 1]}` : `El día ${numero} del ciclo`
}

// Mayor cantidad de días seguidos de trabajo, contando el ciclo como circular (el último día sigue con el primero).
function diasSeguidosDeTrabajo(dias) {
    if (dias.every((d) => d.trabaja)) {
        return Infinity
    }
    let maximo = 0
    let racha = 0
    for (const d of [...dias, ...dias]) {
        racha = d.trabaja ? racha + 1 : 0
        maximo = Math.max(maximo, racha)
    }
    return maximo
}

// Jornada del art. 25 (paquete V): sin calendario fijo (los turnos siguen la programación de los servicios), con un
// tope de horas mensuales. horasSemanales es la referencia para el contrato (horas mensuales × 7 / 30) y
// diasTrabajados los días por semana de referencia que indica la empresa (6 si no indica).
function validarArt25(fecha, opciones) {
    const errores = []
    const advertencias = []
    const horas = Number(opciones.horas_mensuales ?? HORAS_MENSUALES_ART25)
    const dias = Number(opciones.dias_trabajados ?? 6)
    if (!(horas > 0) || horas > HORAS_MENSUALES_ART25) {
        errores.push(`La jornada del art. 25 tiene un tope de ${HORAS_MENSUALES_ART25} horas mensuales`)
    }
    if (!Number.isFinite(dias) || dias < 1 || dias > 7) {
        errores.push("Indica los días de trabajo por semana de referencia (1 a 7)")
    }
    if (fecha >= INICIO_40_HORAS_ART25) {
        advertencias.push("Desde el 26-04-2028 la jornada del art. 25 es de 40 horas semanales promedio en cómputo mensual (Ley 21.561)")
    }
    return {
        dias: [],
        horasMensuales: redondear(horas),
        horasSemanales: redondear(horas * 7 / 30),
        diasTrabajados: redondear(dias),
        cicloDias: 7,
        errores,
        advertencias
    }
}

// Revisa una jornada. fecha: desde cuándo rige (para el máximo legal), en AAAA-MM-DD.
// opciones: { tipo, ciclo_dias, inicio_ciclo, resolucion_numero, resolucion_fecha, resolucion_vigencia_hasta }; sin
// opciones es una jornada semanal de lunes a domingo, como antes del paquete T.
// Devuelve { dias, horasSemanales, diasTrabajados (ambos promedio semanal del ciclo), cicloDias, errores, advertencias }.
function validarJornada(entrada, fecha, opciones = {}) {
    const errores = []
    const advertencias = []
    const tipo = opciones.tipo ?? "semanal"
    const vacio = (mensaje) => ({ dias: [], horasSemanales: 0, diasTrabajados: 0, cicloDias: 0, errores: [mensaje], advertencias })

    if (!TIPOS.includes(tipo)) {
        return vacio("El tipo de jornada debe ser semanal, promedio (art. 22 bis), bisemanal (art. 39), excepcional (art. 38) o de choferes interurbanos (art. 25)")
    }
    if (tipo === "art25") {
        return validarArt25(fecha, opciones)
    }
    const ciclo = tipo === "semanal" ? 7 : Number(opciones.ciclo_dias)

    if (tipo === "semanal" && (!Array.isArray(entrada) || entrada.length !== 7)) {
        return vacio("La jornada debe indicar los 7 días de la semana")
    }
    if (tipo === "promedio" && !CICLOS_PROMEDIO.includes(ciclo)) {
        return vacio("La jornada en promedio (art. 22 bis) se distribuye en ciclos de 2, 3 o 4 semanas (14, 21 o 28 días)")
    }
    if (!Number.isInteger(ciclo) || ciclo < 2 || ciclo > CICLO_MAXIMO) {
        return vacio(`El ciclo debe tener entre 2 y ${CICLO_MAXIMO} días`)
    }
    if (!Array.isArray(entrada) || entrada.length !== ciclo) {
        return vacio(`La jornada debe indicar los ${ciclo} días del ciclo`)
    }

    const dias = [...entrada]
        .map((d) => ({
            dia: Number(d.dia),
            trabaja: d.trabaja === true,
            entrada: d.trabaja === true ? String(d.entrada ?? "") : null,
            salida: d.trabaja === true ? String(d.salida ?? "") : null,
            colacion: d.trabaja === true ? Number(d.colacion ?? 0) : 0
        }))
        .sort((a, b) => a.dia - b.dia)

    if (dias.some((d, i) => d.dia !== i + 1)) {
        return vacio(tipo === "semanal"
            ? "Los días deben ser del 1 (lunes) al 7 (domingo), una vez cada uno"
            : `Los días deben ser del 1 al ${ciclo}, una vez cada uno`)
    }

    let inicio = null
    if (tipo !== "semanal") {
        inicio = String(opciones.inicio_ciclo ?? "").slice(0, 10)
        if (!esFecha(inicio)) {
            errores.push("Indica la fecha en que empieza el día 1 del ciclo")
            inicio = null
        } else if (tipo === "promedio" && new Date(`${inicio}T00:00:00Z`).getUTCDay() !== 1) {
            errores.push("En la jornada en promedio (art. 22 bis) el ciclo se cuenta por semanas: debe empezar un lunes")
        }
    }

    const maximoDiario = tipo === "excepcional" ? MAXIMO_DIARIO_EXCEPCIONAL : MAXIMO_DIARIO
    for (const d of dias.filter((x) => x.trabaja)) {
        const nombre = nombreDelDia(tipo, d.dia)
        const desde = minutosDe(d.entrada)
        const hasta = minutosDe(d.salida)

        if (desde === null || hasta === null) {
            errores.push(`${nombre} debe tener hora de entrada y de salida (HH:MM)`)
            continue
        }
        if (hasta === desde) {
            errores.push(`${nombre}: la entrada y la salida no pueden ser a la misma hora`)
            continue
        }
        if (!Number.isInteger(d.colacion) || d.colacion < 0 || d.colacion >= minutosDelTurno(d)) {
            errores.push(`${nombre}: la colación debe ser un número de minutos menor que el tiempo entre entrada y salida`)
            continue
        }
        if (horasDelDia(d) > maximoDiario) {
            errores.push(`${nombre} supera las ${maximoDiario} horas ordinarias diarias (${horasDelDia(d)} h)`)
        }
        if (d.colacion < COLACION_MINIMA) {
            advertencias.push(`${nombre} tiene menos de ${COLACION_MINIMA} minutos de colación (art. 34 del Código del Trabajo)`)
        }
    }

    const trabajados = dias.filter((d) => d.trabaja).length
    const horasCiclo = dias.reduce((suma, d) => suma + horasDelDia(d), 0)
    const horasSemanales = redondear(horasCiclo * 7 / ciclo)
    const diasTrabajados = redondear(trabajados * 7 / ciclo)
    const maximo = maximoSemanal(fecha)

    if (trabajados === 0) {
        errores.push("La jornada debe tener al menos un día de trabajo")
    }

    if (tipo === "semanal") {
        if (trabajados < DIAS_MINIMOS || trabajados > DIAS_MAXIMOS) {
            errores.push(`La jornada debe distribuirse en ${DIAS_MINIMOS} a ${DIAS_MAXIMOS} días a la semana (tiene ${trabajados})`)
        }
        if (horasSemanales > maximo) {
            errores.push(`La jornada suma ${horasSemanales} horas semanales y el máximo legal desde ${fecha} es ${maximo}`)
        }
    }

    if (tipo === "promedio") {
        const semanas = []
        for (let s = 0; s < ciclo / 7; s++) {
            const semana = dias.slice(s * 7, s * 7 + 7)
            semanas.push({ numero: s + 1, horas: redondear(semana.reduce((suma, d) => suma + horasDelDia(d), 0)), dias: semana.filter((d) => d.trabaja).length })
        }
        for (const semana of semanas) {
            if (semana.horas > MAXIMO_SEMANA_PROMEDIO) {
                errores.push(`La semana ${semana.numero} del ciclo suma ${semana.horas} horas: en la jornada en promedio ninguna semana puede pasar de ${MAXIMO_SEMANA_PROMEDIO} horas ordinarias (art. 22 bis)`)
            }
            if (semana.dias > DIAS_MAXIMOS) {
                errores.push(`La semana ${semana.numero} del ciclo tiene ${semana.dias} días de trabajo: debe tener al menos un día de descanso`)
            }
        }
        let seguidas = 0
        for (const semana of semanas) {
            seguidas = semana.horas > maximo ? seguidas + 1 : 0
            if (seguidas > 2) {
                errores.push(`Hay más de dos semanas seguidas sobre ${maximo} horas: el art. 22 bis no lo permite`)
                break
            }
        }
        if (horasSemanales > maximo) {
            errores.push(`El ciclo promedia ${horasSemanales} horas semanales y el máximo legal desde ${fecha} es ${maximo}`)
        }
    }

    if (tipo === "bisemanal") {
        const seguidos = diasSeguidosDeTrabajo(dias)
        if (seguidos > MAXIMO_CONTINUO_BISEMANAL) {
            errores.push(`La jornada bisemanal permite hasta ${MAXIMO_CONTINUO_BISEMANAL} días seguidos de trabajo (art. 39); este ciclo tiene ${seguidos === Infinity ? "todos los días de trabajo" : `${seguidos} seguidos`}`)
        } else {
            const descanso = ciclo - trabajados
            const necesario = Math.ceil(seguidos / 7) + 1
            if (descanso < necesario) {
                advertencias.push(`Con ${seguidos} días seguidos de trabajo, el descanso debe cubrir los domingos y festivos del período más uno (art. 39): pueden ser hasta ${necesario} días y el ciclo tiene ${descanso}`)
            }
        }
        if (horasSemanales > maximo) {
            errores.push(`El ciclo promedia ${horasSemanales} horas semanales y el máximo legal desde ${fecha} es ${maximo}`)
        }
    }

    if (tipo === "excepcional") {
        const numero = String(opciones.resolucion_numero ?? "").trim()
        const fechaResolucion = String(opciones.resolucion_fecha ?? "").slice(0, 10)
        const vigencia = String(opciones.resolucion_vigencia_hasta ?? "").slice(0, 10)
        if (numero === "") {
            errores.push("El sistema excepcional necesita el número de la resolución de la Dirección del Trabajo que lo autoriza")
        }
        if (!esFecha(fechaResolucion) || !esFecha(vigencia)) {
            errores.push("Indica la fecha de la resolución y hasta cuándo está vigente")
        } else if (vigencia < fechaResolucion) {
            errores.push("La vigencia de la resolución no puede terminar antes de su fecha")
        } else {
            if (vigencia > sumarAnios(fechaResolucion, 3)) {
                errores.push("La resolución que autoriza un sistema excepcional rige por hasta tres años (art. 38 inc. 8)")
            }
            if (vigencia < fecha) {
                advertencias.push(`La resolución venció el ${vigencia}: el sistema excepcional necesita una renovación de la Dirección del Trabajo`)
            }
        }
        if (horasSemanales > maximo) {
            advertencias.push(`El ciclo promedia ${horasSemanales} horas semanales, sobre el máximo legal de ${maximo}: solo procede si la resolución lo autoriza (art. 38 inc. 8)`)
        }
    }

    return { dias, horasSemanales, diasTrabajados, cicloDias: ciclo, errores, advertencias }
}

function horaCorta(hora) {
    return hora.replace(/^0/, "")
}

// Texto de la distribución para el contrato: agrupa días seguidos con el mismo horario.
// Semanal: "Lunes a jueves de 8:00 a 18:00 horas; viernes de 8:00 a 17:00 horas, con 60 minutos de colación."
// Por ciclo (tipo distinto de semanal): "Días 1 a 7 de 8:00 a 20:00 horas; días 8 a 14 de descanso, con 60 minutos…".
function textoDistribucion(dias, tipo = "semanal") {
    const semanal = tipo === "semanal"
    const grupos = []
    for (const d of dias.filter((x) => x.trabaja || !semanal)) {
        const ultimo = grupos[grupos.length - 1]
        const igual = ultimo && ultimo.hasta === d.dia - 1 && ultimo.trabaja === d.trabaja
            && (!d.trabaja || (ultimo.entrada === d.entrada && ultimo.salida === d.salida && ultimo.colacion === d.colacion))
        if (igual) {
            ultimo.hasta = d.dia
        } else {
            grupos.push({ desde: d.dia, hasta: d.dia, trabaja: d.trabaja, entrada: d.entrada, salida: d.salida, colacion: d.colacion })
        }
    }

    const nombre = (g) => {
        if (semanal) {
            return g.desde === g.hasta ? NOMBRES_DIA[g.desde - 1] : `${NOMBRES_DIA[g.desde - 1]} a ${NOMBRES_DIA[g.hasta - 1]}`
        }
        return g.desde === g.hasta ? `día ${g.desde}` : `días ${g.desde} ${g.hasta === g.desde + 1 ? "y" : "a"} ${g.hasta}`
    }
    const tramos = grupos.map((g) => g.trabaja
        ? `${nombre(g)} de ${horaCorta(g.entrada)} a ${horaCorta(g.salida)} horas${cruzaMedianoche(g) ? " del día siguiente" : ""}`
        : `${nombre(g)} de descanso`)
    const trabajo = grupos.filter((g) => g.trabaja)
    const colaciones = [...new Set(trabajo.map((g) => g.colacion))]
    const textoColacion = colaciones.length === 1
        ? `, con ${colaciones[0]} minutos de colación diaria`
        : `, con la colación indicada para cada día (${trabajo.map((g) => `${g.colacion} min`).join(", ")})`

    const texto = tramos.join("; ") + textoColacion
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function fechaEnTextoSimple(fecha) {
    const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    const [anio, mes, dia] = String(fecha).slice(0, 10).split("-").map(Number)
    return `${dia} de ${MESES[mes - 1]} de ${anio}`
}

function numeroTexto(valor) {
    return String(Number(valor)).replace(".", ",")
}

// Cláusula de la jornada con su distribución, según el tipo legal. horas: horas semanales (promedio) del contrato.
// Termina en punto. La semanal mantiene el texto de siempre.
function clausulaDistribucion(jornada, horas) {
    const tipo = jornada.tipo ?? "semanal"
    if (tipo === "art25") {
        return `La jornada ordinaria de trabajo será de ${numeroTexto(jornada.horas_mensuales ?? HORAS_MENSUALES_ART25)} horas mensuales, conforme al artículo 25 del Código del Trabajo, y se distribuirá según la programación de los servicios. El tiempo de los descansos a bordo o en tierra y de las esperas que corresponda cumplir entre turnos sin realizar labor no se imputará a la jornada, y su retribución o compensación se ajustará al acuerdo de las partes. El TRABAJADOR tendrá un descanso mínimo ininterrumpido de ocho horas dentro de cada veinticuatro horas y no manejará más de cinco horas continuas, después de las cuales tendrá un descanso de al menos dos horas.`
    }
    const distribucion = textoDistribucion(jornada.dias, tipo)
    const ciclo = Number(jornada.ciclo_dias)
    const inicio = jornada.inicio_ciclo ? fechaEnTextoSimple(jornada.inicio_ciclo) : ""
    if (tipo === "promedio") {
        return `La jornada ordinaria de trabajo será de ${numeroTexto(horas)} horas semanales en promedio, distribuidas en ciclos de ${ciclo / 7} semanas conforme al artículo 22 bis del Código del Trabajo, contados desde el ${inicio}, según el siguiente calendario: ${distribucion}.`
    }
    if (tipo === "bisemanal") {
        return `La jornada ordinaria de trabajo será bisemanal, conforme al artículo 39 del Código del Trabajo, en ciclos de ${ciclo} días contados desde el ${inicio}, con un promedio de ${numeroTexto(horas)} horas semanales: ${distribucion}. Al término de cada período de trabajo se otorgarán los días de descanso compensatorio de los domingos y festivos ocurridos en él, aumentados en uno.`
    }
    if (tipo === "excepcional") {
        return `La jornada ordinaria de trabajo se regirá por el sistema excepcional de distribución de jornada de trabajo y descansos autorizado por la Dirección del Trabajo mediante Resolución N° ${jornada.resolucion_numero}, de ${fechaEnTextoSimple(jornada.resolucion_fecha)}, vigente hasta el ${fechaEnTextoSimple(jornada.resolucion_vigencia_hasta)}, conforme al inciso séptimo del artículo 38 del Código del Trabajo, en ciclos de ${ciclo} días contados desde el ${inicio}, con un promedio de ${numeroTexto(horas)} horas semanales: ${distribucion}.`
    }
    return `La jornada ordinaria de trabajo será de ${numeroTexto(horas)} horas semanales, distribuidas de la siguiente manera: ${distribucion}.`
}

module.exports = {
    NOMBRES_DIA,
    TIPOS,
    HORAS_MENSUALES_ART25,
    maximoSemanal,
    horasDelDia,
    cruzaMedianoche,
    minutosDelTurno,
    validarJornada,
    textoDistribucion,
    clausulaDistribucion,
    numeroDelCiclo,
    diaDelCiclo
}
