// Reglas legales de la jornada semanal (función pura, sin base de datos).
// Una jornada guarda los 7 días: { dia: 1..7 (lunes a domingo), trabaja, entrada "HH:MM", salida "HH:MM", colacion: minutos }.

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
function horasDelDia(dia) {
    if (!dia?.trabaja) {
        return 0
    }
    return redondear((minutosDe(dia.salida) - minutosDe(dia.entrada) - Number(dia.colacion ?? 0)) / 60)
}

// Revisa una jornada semanal. fecha: desde cuándo rige (para el máximo legal), en AAAA-MM-DD.
// Devuelve { dias (normalizados y ordenados), horasSemanales, diasTrabajados, errores, advertencias }.
function validarJornada(entrada, fecha) {
    const errores = []
    const advertencias = []

    if (!Array.isArray(entrada) || entrada.length !== 7) {
        return { dias: [], horasSemanales: 0, diasTrabajados: 0, errores: ["La jornada debe indicar los 7 días de la semana"], advertencias }
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
        return { dias: [], horasSemanales: 0, diasTrabajados: 0, errores: ["Los días deben ser del 1 (lunes) al 7 (domingo), una vez cada uno"], advertencias }
    }

    for (const d of dias.filter((x) => x.trabaja)) {
        const nombre = NOMBRES_DIA[d.dia - 1]
        const inicio = minutosDe(d.entrada)
        const fin = minutosDe(d.salida)

        if (inicio === null || fin === null) {
            errores.push(`El ${nombre} debe tener hora de entrada y de salida (HH:MM)`)
            continue
        }
        if (fin <= inicio) {
            errores.push(`El ${nombre} la salida debe ser posterior a la entrada (los turnos que cruzan la medianoche van con las jornadas por turnos)`)
            continue
        }
        if (!Number.isInteger(d.colacion) || d.colacion < 0 || d.colacion >= fin - inicio) {
            errores.push(`El ${nombre} la colación debe ser un número de minutos menor que el tiempo entre entrada y salida`)
            continue
        }
        if (horasDelDia(d) > MAXIMO_DIARIO) {
            errores.push(`El ${nombre} supera las ${MAXIMO_DIARIO} horas ordinarias diarias (${horasDelDia(d)} h)`)
        }
        if (d.colacion < COLACION_MINIMA) {
            advertencias.push(`El ${nombre} tiene menos de ${COLACION_MINIMA} minutos de colación (art. 34 del Código del Trabajo)`)
        }
    }

    const diasTrabajados = dias.filter((d) => d.trabaja).length
    const horasSemanales = redondear(dias.reduce((suma, d) => suma + horasDelDia(d), 0))
    const maximo = maximoSemanal(fecha)

    if (diasTrabajados < DIAS_MINIMOS || diasTrabajados > DIAS_MAXIMOS) {
        errores.push(`La jornada debe distribuirse en ${DIAS_MINIMOS} a ${DIAS_MAXIMOS} días a la semana (tiene ${diasTrabajados})`)
    }
    if (horasSemanales > maximo) {
        errores.push(`La jornada suma ${horasSemanales} horas semanales y el máximo legal desde ${fecha} es ${maximo}`)
    }

    return { dias, horasSemanales, diasTrabajados, errores, advertencias }
}

function horaCorta(hora) {
    return hora.replace(/^0/, "")
}

// Texto de la distribución para el contrato: agrupa días seguidos con el mismo horario.
// "Lunes a jueves de 8:00 a 18:00 horas; viernes de 8:00 a 17:00 horas, con 60 minutos de colación."
function textoDistribucion(dias) {
    const grupos = []
    for (const d of dias.filter((x) => x.trabaja)) {
        const ultimo = grupos[grupos.length - 1]
        const igual = ultimo && ultimo.hasta === d.dia - 1 && ultimo.entrada === d.entrada && ultimo.salida === d.salida && ultimo.colacion === d.colacion
        if (igual) {
            ultimo.hasta = d.dia
        } else {
            grupos.push({ desde: d.dia, hasta: d.dia, entrada: d.entrada, salida: d.salida, colacion: d.colacion })
        }
    }

    const tramos = grupos.map((g) => {
        const dias = g.desde === g.hasta ? NOMBRES_DIA[g.desde - 1] : `${NOMBRES_DIA[g.desde - 1]} a ${NOMBRES_DIA[g.hasta - 1]}`
        return `${dias} de ${horaCorta(g.entrada)} a ${horaCorta(g.salida)} horas`
    })
    const colaciones = [...new Set(grupos.map((g) => g.colacion))]
    const textoColacion = colaciones.length === 1
        ? `, con ${colaciones[0]} minutos de colación diaria`
        : `, con la colación indicada para cada día (${grupos.map((g) => `${g.colacion} min`).join(", ")})`

    const texto = tramos.join("; ") + textoColacion
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

module.exports = {
    NOMBRES_DIA,
    maximoSemanal,
    horasDelDia,
    validarJornada,
    textoDistribucion
}
