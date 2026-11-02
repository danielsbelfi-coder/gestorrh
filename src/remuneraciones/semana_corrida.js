// Sueldo por día o por hora y semana corrida (art. 45 del Código del Trabajo). Funciones puras.
// Ver «Semana corrida (art. 45)» en el SPEC.
//
// dias: filas del libro de asistencia del mes ({ fecha, diaSemana, esperado: { tipo, entrada, salida, colacion }, marca }).
// Lo que se toma del libro: los días laborales de la jornada (sin feriados ni licencias, dentro del contrato), las marcas
// aprobadas de cada día y los domingos y festivos. Los días de inasistencia, permiso sin goce y vacaciones del resumen
// aprobado mandan (puede ser manual): si el resumen tiene más que las marcas, la diferencia se descuenta igual.

const DOMINGO = 7
const NO_PAGADAS = ["inasistencia", "permiso_sin_goce"]
// Días que no se cuentan como "debió trabajar" para el divisor (art. 45; DT 110/001).
const FUERA_DEL_DIVISOR = ["vacaciones", "permiso_sin_goce", "permiso_con_goce"]

const minutosDe = (hora) => {
    const coincidencia = /^(\d{2}):(\d{2})/.exec(String(hora ?? ""))
    return coincidencia ? Number(coincidencia[1]) * 60 + Number(coincidencia[2]) : 0
}

function horasDelDia(esperado) {
    return Math.max(0, minutosDe(esperado.salida) - minutosDe(esperado.entrada) - Number(esperado.colacion ?? 0)) / 60
}

const marcaAprobada = (fila, tipos) => fila.marca?.estado_aprobacion === "aprobada" && tipos.includes(fila.marca.tipo)

// Sueldo vigente el día (tramos [{ desdeDia, sueldo }] del contrato del mes, por anexos de sueldo).
function sueldoDelDia(tramos, fecha) {
    const dia = Number(fecha.slice(8, 10))
    let sueldo = tramos[0].sueldo
    for (const tramo of tramos) {
        if (tramo.desdeDia <= dia) {
            sueldo = tramo.sueldo
        }
    }
    return Number(sueldo)
}

// Lunes de la semana de la fecha (para agrupar por semana).
function lunesDe(fila) {
    const fecha = new Date(`${fila.fecha}T00:00:00Z`)
    fecha.setUTCDate(fecha.getUTCDate() - (fila.diaSemana - 1))
    return fecha.toISOString().slice(0, 10)
}

// Clasifica los días laborales del mes. resumen: { dias_inasistencia, dias_permiso_sin_goce, dias_vacaciones }.
function clasificarDias(dias, resumen) {
    const laborales = dias.filter((f) => f.esperado.tipo === "laboral")
    const noPagadas = laborales.filter((f) => marcaAprobada(f, NO_PAGADAS))
    const vacaciones = laborales.filter((f) => marcaAprobada(f, ["vacaciones"]))
    const conGoce = laborales.filter((f) => marcaAprobada(f, ["permiso_con_goce"]))
    const sinGoce = noPagadas.filter((f) => f.marca.tipo === "permiso_sin_goce")

    // El resumen aprobado puede traer más días que las marcas (ingreso manual): se descuentan de los últimos días.
    const resumenNoPagadas = Number(resumen.dias_inasistencia ?? 0) + Number(resumen.dias_permiso_sin_goce ?? 0)
    const libres = laborales.filter((f) => !noPagadas.includes(f) && !vacaciones.includes(f) && !conGoce.includes(f))
    const extraNoPagadas = Math.min(libres.length, Math.max(0, resumenNoPagadas - noPagadas.length))
    const descontadas = libres.slice(libres.length - extraNoPagadas)
    const extraVacaciones = Math.max(0, Number(resumen.dias_vacaciones ?? 0) - vacaciones.length)
    const restantes = libres.filter((f) => !descontadas.includes(f))
    const vacacionesResumen = restantes.slice(Math.max(0, restantes.length - extraVacaciones))

    const pagadas = laborales.filter((f) => !noPagadas.includes(f) && !descontadas.includes(f))
    const trabajadas = pagadas.filter((f) => !vacaciones.includes(f) && !conGoce.includes(f) && !vacacionesResumen.includes(f))
    const extraSinGoce = Math.max(0, Number(resumen.dias_permiso_sin_goce ?? 0) - sinGoce.length)
    const divisor = laborales.length - vacaciones.length - vacacionesResumen.length - conGoce.length - sinGoce.length - Math.min(extraSinGoce, descontadas.length)

    return { laborales, pagadas, trabajadas, divisor: Math.max(0, divisor) }
}

// Sueldo del mes de un contrato diario (sueldo = valor del día) o por hora (sueldo = valor de la hora).
// Se pagan los días laborales menos inasistencias y permisos sin goce (las vacaciones y permisos con goce se pagan).
function sueldoPorDias({ sistema, dias, tramos, resumen }) {
    const { pagadas } = clasificarDias(dias, resumen)
    const unidad = (fila) => (sistema === "hora" ? horasDelDia(fila.esperado) : 1)
    const cantidad = Math.round(pagadas.reduce((suma, f) => suma + unidad(f), 0) * 100) / 100
    const monto = Math.round(pagadas.reduce((suma, f) => suma + unidad(f) * sueldoDelDia(tramos, f.fecha), 0))
    return { sistema, cantidad, monto }
}

// Domingos y festivos del mes que se pagan. Con jornada que incluye el domingo (art. 38), los días libres de la
// semana son el descanso (art. 45, inciso final). No se pagan los de una semana sin ningún día laboral disponible
// (toda la semana con licencia, vacaciones o permisos); la inasistencia no hace perder el derecho.
function diasDeDescanso(dias, trabajaDomingo) {
    const semanas = new Map()
    for (const fila of dias) {
        const clave = lunesDe(fila)
        if (!semanas.has(clave)) {
            semanas.set(clave, { disponibles: 0, ausentes: 0 })
        }
        const semana = semanas.get(clave)
        if (fila.esperado.tipo === "licencia") {
            semana.ausentes++
        } else if (fila.esperado.tipo === "laboral") {
            if (marcaAprobada(fila, FUERA_DEL_DIVISOR)) {
                semana.ausentes++
            } else {
                semana.disponibles++
            }
        }
    }

    return dias.filter((fila) => {
        const descanso = fila.esperado.tipo === "feriado"
            || (fila.esperado.tipo === "libre" && (fila.diaSemana === DOMINGO || trabajaDomingo))
        if (!descanso) {
            return false
        }
        const semana = semanas.get(lunesDe(fila))
        return !(semana.ausentes > 0 && semana.disponibles === 0)
    }).map((fila) => fila.fecha)
}

// Semana corrida del mes (cálculo mensual, dictamen DT 110/001): lo devengado por día en el mes / días que debió
// trabajar × domingos y festivos. Base: el sueldo de los días u horas efectivamente trabajados (contrato diario o por
// hora) más los haberes variables de devengo diario (comisiones, tratos). Con sueldo mensual, solo lo variable.
// variablesDiarias: monto total del mes de los conceptos marcados «devengo diario».
function calcularSemanaCorrida({ sistema, dias, tramos, resumen, variablesDiarias = 0, trabajaDomingo = false }) {
    const { trabajadas, divisor } = clasificarDias(dias, resumen)
    let sueldo = 0
    if (sistema === "diario" || sistema === "hora") {
        const unidad = (fila) => (sistema === "hora" ? horasDelDia(fila.esperado) : 1)
        sueldo = Math.round(trabajadas.reduce((suma, f) => suma + unidad(f) * sueldoDelDia(tramos, f.fecha), 0))
    }
    const base = sueldo + Math.round(Number(variablesDiarias) || 0)
    const fechas = diasDeDescanso(dias, trabajaDomingo)
    const monto = base > 0 && divisor > 0 ? Math.round(base / divisor * fechas.length) : 0
    return { sueldo, variables: base - sueldo, base, divisor, dias: fechas.length, fechas, monto }
}

// Valor de la hora ordinaria para horas extra y atrasos de un contrato diario o por hora: la semana corrida integra
// la remuneración (art. 45, inciso 3): (valor del día × días de la semana + un día de descanso) / horas semanales.
// Nunca menor al que resulta del ingreso mínimo mensual.
function valorHoraPorDias({ sistema, sueldo, diasSemana, horasSemanales, minimoPorHora }) {
    if (!diasSemana || !horasSemanales) {
        return minimoPorHora
    }
    const diario = sistema === "hora" ? Number(sueldo) * horasSemanales / diasSemana : Number(sueldo)
    return Math.max(diario * (diasSemana + 1) / horasSemanales, minimoPorHora)
}

module.exports = { horasDelDia, clasificarDias, sueldoPorDias, diasDeDescanso, calcularSemanaCorrida, valorHoraPorDias }
