const DIAS_MES_COMERCIAL = 30

const { diasEntre } = require("../shared/fechas.js")

function estaEnElMes(fecha, anio, mes) {
    return fecha !== null && fecha.slice(0, 7) === `${anio}-${String(mes).padStart(2, "0")}`
}

function calcularDiasPago({ anio, mes, fechaIngreso, fechaTermino, resumen }) {
    const ultimoDiaMes = new Date(anio, mes, 0).getDate()

    let diasAntes = 0
    if (estaEnElMes(fechaIngreso, anio, mes)) {
        const dia = Math.min(Number(fechaIngreso.slice(8, 10)), DIAS_MES_COMERCIAL)
        diasAntes = dia - 1
    }

    let diasDespues = 0
    if (estaEnElMes(fechaTermino, anio, mes)) {
        const dia = Number(fechaTermino.slice(8, 10))
        diasDespues = dia === ultimoDiaMes ? 0 : DIAS_MES_COMERCIAL - Math.min(dia, DIAS_MES_COMERCIAL)
    }

    const diasNoContratado = diasAntes + diasDespues

    const diasNoPagados = diasNoContratado
        + resumen.dias_inasistencia
        + resumen.dias_licencia_medica
        + resumen.dias_permiso_sin_goce

    const diasNoTrabajadosCalendario = (estaEnElMes(fechaIngreso, anio, mes) ? Number(fechaIngreso.slice(8, 10)) - 1 : 0)
        + (estaEnElMes(fechaTermino, anio, mes) ? ultimoDiaMes - Number(fechaTermino.slice(8, 10)) : 0)
        + resumen.dias_inasistencia
        + resumen.dias_licencia_medica
        + resumen.dias_permiso_sin_goce

    const diasPagados = diasNoTrabajadosCalendario >= ultimoDiaMes
        ? 0
        : Math.max(1, DIAS_MES_COMERCIAL - diasNoPagados)

    return { diasNoContratado, diasPagados }
}

function diasLicenciaEnMes(licencias, anio, mes) {
    const mm = String(mes).padStart(2, "0")
    const primerDia = `${anio}-${mm}-01`
    const ultimoDia = `${anio}-${mm}-${String(new Date(Date.UTC(anio, mes, 0)).getUTCDate()).padStart(2, "0")}`

    const total = licencias.reduce((suma, licencia) => {
        const desde = licencia.fecha_inicio > primerDia ? licencia.fecha_inicio : primerDia
        const hasta = licencia.fecha_termino < ultimoDia ? licencia.fecha_termino : ultimoDia

        if (desde > hasta) {
            return suma
        }

        return suma + diasEntre(desde, hasta)

    }, 0)

    return total
}

function rimaDelMes(licencias, anio, mes) {
    const mm = String(mes).padStart(2, "0")
    const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
    const primerDia = `${anio}-${mm}-01`
    const ultimoDia = `${anio}-${mm}-${String(diasDelMes).padStart(2, "0")}`

    const total = licencias.reduce((suma, licencia) => {
        const desde = licencia.fecha_inicio > primerDia ? licencia.fecha_inicio : primerDia
        const hasta = licencia.fecha_termino < ultimoDia ? licencia.fecha_termino : ultimoDia

        if (desde > hasta) {
            return suma
        }

        const dias = diasEntre(desde, hasta)
        const diasProporcion = dias >= diasDelMes ? DIAS_MES_COMERCIAL : Math.min(dias, DIAS_MES_COMERCIAL)

        return suma + licencia.rima * diasProporcion / DIAS_MES_COMERCIAL
    }, 0)

    return Math.round(total)
}

function tramoDelDia(tramos, dia) {
    let indice = 0
    tramos.forEach((tramo, i) => {
        if (tramo.desdeDia <= dia) {
            indice = i
        }
    })
    return indice
}

function diasPorTramo({ tramos, anio, mes, diasPagados, fechaIngreso, fechaTermino, fechasAusencia }) {
    if (tramos.length === 1) {
        return [{ ...tramos[0], dias: diasPagados }]
    }

    const ultimoDiaMes = new Date(anio, mes, 0).getDate()
    const dias = tramos.map((tramo, i) => {
        const fin = i < tramos.length - 1 ? tramos[i + 1].desdeDia - 1 : DIAS_MES_COMERCIAL
        return fin - tramo.desdeDia + 1
    })

    const restar = (dia) => {
        dias[tramoDelDia(tramos, Math.min(dia, DIAS_MES_COMERCIAL))] -= 1
    }

    if (estaEnElMes(fechaIngreso, anio, mes)) {
        for (let dia = 1; dia < Number(fechaIngreso.slice(8, 10)); dia++) {
            restar(dia)
        }
    }
    if (estaEnElMes(fechaTermino, anio, mes)) {
        const termino = Number(fechaTermino.slice(8, 10))
        if (termino < ultimoDiaMes) {
            for (let dia = termino + 1; dia <= DIAS_MES_COMERCIAL; dia++) {
                restar(dia)
            }
        }
    }
    for (const fecha of fechasAusencia) {
        restar(Number(fecha.slice(8, 10)))
    }

    for (let i = 0; i < dias.length; i++) {
        dias[i] = Math.max(0, dias[i])
    }

    let diferencia = diasPagados - dias.reduce((suma, d) => suma + d, 0)
    for (let i = dias.length - 1; i >= 0 && diferencia !== 0; i--) {
        const ajuste = Math.max(-dias[i], diferencia)
        dias[i] += ajuste
        diferencia -= ajuste
    }

    return tramos.map((tramo, i) => ({ ...tramo, dias: dias[i] }))
}

module.exports = {
    calcularDiasPago,
    DIAS_MES_COMERCIAL,
    diasLicenciaEnMes,
    rimaDelMes,
    estaEnElMes,
    diasPorTramo
}