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

module.exports = {
    calcularDiasPago,
    DIAS_MES_COMERCIAL,
    diasLicenciaEnMes,
    rimaDelMes,
    estaEnElMes
}