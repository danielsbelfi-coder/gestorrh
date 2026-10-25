const DIAS_MES_COMERCIAL = 30

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

    return {
        diasNoContratado,
        diasPagados: Math.max(0, DIAS_MES_COMERCIAL - diasNoPagados)
    }
}

module.exports = {
    calcularDiasPago,
    DIAS_MES_COMERCIAL
}