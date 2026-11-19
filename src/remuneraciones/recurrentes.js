// Variables permanentes y préstamos en cuotas (funciones puras). Ver «Paquete P» en el SPEC.
// Una recurrente se define una vez y agrega una variable aprobada a cada mes que le toca:
// - permanente: el mismo monto desde un mes hasta otro (o hasta el término de la relación); puede ser proporcional
//   a los días pagados del mes (ingreso, término, licencia o permiso sin goce en el mes);
// - cuotas: un préstamo de la empresa de monto total T en N cuotas mensuales desde un mes; la última ajusta el redondeo.
const { esFechaValida } = require("../shared/fechas.js")

const MAX_CUOTAS = 120

const indiceMes = (iso) => Number(String(iso).slice(0, 4)) * 12 + Number(String(iso).slice(5, 7)) - 1

// «2027-01» o «2027-01-15» → «2027-01-01». null si no es un mes válido.
function primerDiaDelMes(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}/.test(valor)) {
        return null
    }
    const iso = `${valor.slice(0, 7)}-01`
    return esFechaValida(iso) ? iso : null
}

function montoCuota(total, cuotas, numero) {
    const base = Math.floor(total / cuotas)
    return numero === cuotas ? total - base * (cuotas - 1) : base
}

// Lo que la recurrente agrega en el mes, o null si no le toca: { monto, numeroCuota, proporcional, glosa }.
function enMes(recurrente, anio, mes) {
    const k = anio * 12 + mes - 1 - indiceMes(recurrente.desde_mes)
    if (k < 0) {
        return null
    }
    if (recurrente.tipo === "cuotas") {
        const numero = k + 1
        if (numero > recurrente.cuotas) {
            return null
        }
        return {
            monto: montoCuota(recurrente.monto, recurrente.cuotas, numero),
            numeroCuota: numero,
            proporcional: false,
            glosa: `${recurrente.glosa || "Préstamo"} · cuota ${numero} de ${recurrente.cuotas}`
        }
    }
    if (recurrente.hasta_mes && anio * 12 + mes - 1 > indiceMes(recurrente.hasta_mes)) {
        return null
    }
    return { monto: recurrente.monto, numeroCuota: null, proporcional: Boolean(recurrente.proporcional), glosa: recurrente.glosa || null }
}

// Monto del mes de una permanente proporcional: sobre 30 días (mes comercial), como el sueldo.
function montoProporcional(monto, diasPagados) {
    return Math.round(monto * Math.max(0, Math.min(Number(diasPagados), 30)) / 30)
}

// Préstamo en cuotas al término de la relación: las cuotas de los meses hasta el del término se descontaron en las
// liquidaciones; el resto es el saldo que se propone descontar en el finiquito.
function saldoAlTermino(recurrente, fechaTermino) {
    const pagadas = Math.max(0, Math.min(recurrente.cuotas, indiceMes(fechaTermino) - indiceMes(recurrente.desde_mes) + 1))
    const pagado = pagadas === recurrente.cuotas ? recurrente.monto : Math.floor(recurrente.monto / recurrente.cuotas) * pagadas
    return { pagadas, pendientes: recurrente.cuotas - pagadas, saldo: recurrente.monto - pagado }
}

// Valida y normaliza los datos de una recurrente. Devuelve { errores, datos }.
function validarRecurrente(entrada) {
    const errores = []
    const tipo = entrada.tipo
    const monto = Number(entrada.monto)
    const desde = primerDiaDelMes(entrada.desde_mes)
    const hasta = entrada.hasta_mes ? primerDiaDelMes(entrada.hasta_mes) : null
    const cuotas = tipo === "cuotas" ? Number(entrada.cuotas) : null

    if (tipo !== "permanente" && tipo !== "cuotas") {
        errores.push("El tipo debe ser «permanente» o «cuotas»")
    }
    if (!Number.isInteger(monto) || monto <= 0) {
        errores.push(tipo === "cuotas" ? "El monto total del préstamo debe ser un número entero mayor que 0" : "El monto mensual debe ser un número entero mayor que 0")
    }
    if (desde === null) {
        errores.push("Indica el mes desde el que rige (AAAA-MM)")
    }
    if (tipo === "permanente" && entrada.hasta_mes && hasta === null) {
        errores.push("El mes «hasta» no es válido (AAAA-MM)")
    }
    if (tipo === "permanente" && desde && hasta && hasta < desde) {
        errores.push("El mes «hasta» no puede ser anterior al mes «desde»")
    }
    if (tipo === "cuotas" && (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > MAX_CUOTAS)) {
        errores.push(`El número de cuotas debe ser un entero entre 1 y ${MAX_CUOTAS}`)
    } else if (tipo === "cuotas" && Number.isInteger(monto) && cuotas > monto) {
        errores.push("Hay más cuotas que pesos en el préstamo")
    }
    const glosa = typeof entrada.glosa === "string" && entrada.glosa.trim() !== "" ? entrada.glosa.trim().slice(0, 255) : null

    return {
        errores,
        datos: {
            tipo,
            monto,
            cuotas,
            proporcional: tipo === "permanente" && entrada.proporcional === true,
            desde_mes: desde,
            hasta_mes: tipo === "permanente" ? hasta : null,
            glosa
        }
    }
}

module.exports = { enMes, montoCuota, montoProporcional, saldoAlTermino, validarRecurrente, primerDiaDelMes, indiceMes, MAX_CUOTAS }
