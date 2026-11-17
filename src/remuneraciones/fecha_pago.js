// Fecha de pago de remuneraciones según la regla de la empresa (funciones puras). Ver «Fecha de pago» en el SPEC.
// Reglas: «último día hábil del mes» del periodo, o «día N del mes siguiente». Si la fecha cae en día inhábil
// (sábado, domingo o feriado del lugar de la casa matriz), se adelanta al día hábil anterior.

const REGLAS_PAGO = {
    ultimo_dia_habil: "Último día hábil del mes",
    dia_mes_siguiente: "Día fijo del mes siguiente"
}
const DIA_MAXIMO = 31

// Valida la regla. Devuelve { datos: { regla_fecha_pago, dia_pago }, errores }. Regla vacía = sin regla.
function validarReglaPago(entrada) {
    const regla = entrada.regla_fecha_pago === "" || entrada.regla_fecha_pago === undefined ? null : entrada.regla_fecha_pago
    const errores = []

    if (regla === null) {
        return { datos: { regla_fecha_pago: null, dia_pago: null }, errores }
    }
    if (REGLAS_PAGO[regla] === undefined) {
        return { datos: { regla_fecha_pago: null, dia_pago: null }, errores: ["La regla de fecha de pago no es válida"] }
    }
    if (regla === "ultimo_dia_habil") {
        return { datos: { regla_fecha_pago: regla, dia_pago: null }, errores }
    }

    const dia = Number(entrada.dia_pago)
    if (entrada.dia_pago === null || entrada.dia_pago === "" || !Number.isInteger(dia) || dia < 1 || dia > DIA_MAXIMO) {
        errores.push(`Indica el día de pago del mes siguiente (1 a ${DIA_MAXIMO})`)
    }
    return { datos: { regla_fecha_pago: regla, dia_pago: dia }, errores }
}

const iso = (fecha) => fecha.toISOString().slice(0, 10)
const ultimoDiaDelMes = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate()

// feriados: Set o lista de fechas AAAA-MM-DD que rigen en la casa matriz.
function esInhabil(fecha, feriados) {
    const dia = fecha.getUTCDay()
    return dia === 0 || dia === 6 || feriados.has(iso(fecha))
}

function adelantarAHabil(fecha, feriados) {
    const resultado = new Date(fecha)
    while (esInhabil(resultado, feriados)) {
        resultado.setUTCDate(resultado.getUTCDate() - 1)
    }
    return iso(resultado)
}

// Fecha de pago del periodo anio/mes (mes 1 a 12). Sin regla devuelve null.
function fechaDePago({ regla, dia, anio, mes, feriados = [] }) {
    const inhabiles = feriados instanceof Set ? feriados : new Set(feriados.map((f) => String(f).slice(0, 10)))

    if (regla === "ultimo_dia_habil") {
        return adelantarAHabil(new Date(Date.UTC(anio, mes - 1, ultimoDiaDelMes(anio, mes))), inhabiles)
    }
    if (regla === "dia_mes_siguiente") {
        const anioPago = mes === 12 ? anio + 1 : anio
        const mesPago = mes === 12 ? 1 : mes + 1
        // Día 31 en un mes de 30 días (o 29 y 30 en febrero): el último día de ese mes.
        const diaPago = Math.min(Number(dia), ultimoDiaDelMes(anioPago, mesPago))
        return adelantarAHabil(new Date(Date.UTC(anioPago, mesPago - 1, diaPago)), inhabiles)
    }
    return null
}

// Rango de fechas cuyos feriados importan para el periodo (del mes del periodo y del siguiente).
function rangoFeriados(anio, mes) {
    const anioSig = mes === 12 ? anio + 1 : anio
    const mesSig = mes === 12 ? 1 : mes + 1
    const mm = (m) => String(m).padStart(2, "0")
    return { desde: `${anio}-${mm(mes)}-01`, hasta: `${anioSig}-${mm(mesSig)}-${ultimoDiaDelMes(anioSig, mesSig)}` }
}

function textoReglaPago(regla, dia) {
    if (regla === "dia_mes_siguiente") {
        return `Día ${dia} del mes siguiente (o el día hábil anterior)`
    }
    return REGLAS_PAGO[regla] ?? "Sin fecha de pago definida"
}

module.exports = { REGLAS_PAGO, validarReglaPago, fechaDePago, rangoFeriados, textoReglaPago }
