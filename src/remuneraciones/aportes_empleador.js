// fijos: aportes con monto ya calculado (por ejemplo, el aporte del empleador al APV colectivo).
// baseCesantiaEmpleador: base del aporte del empleador al seguro de cesantía, que incluye los días de licencia médica
// (art. 8 Ley 19.728); por defecto, la misma base del trabajador.
function calcularAportesEmpleador({ baseCotizaciones, baseCesantia, baseSeguroSocial = baseCotizaciones, baseCesantiaEmpleador = baseCesantia, tasas, fijos = [], conceptos }) {
    const calculos = [
        { concepto: conceptos.APORTE_CESANTIA, base: baseCesantiaEmpleador, tasa: tasas.cesantia },
        { concepto: conceptos.APORTE_MUTUAL, base: baseCotizaciones, tasa: tasas.mutual },
        { concepto: conceptos.APORTE_SANNA, base: baseCotizaciones, tasa: tasas.sanna },
        { concepto: conceptos.APORTE_SIS, base: baseSeguroSocial, tasa: tasas.sis },
        { concepto: conceptos.APORTE_EXPECTATIVA_VIDA, base: baseSeguroSocial, tasa: tasas.expectativaVida },
        { concepto: conceptos.APORTE_CUENTA_INDIVIDUAL, base: baseCotizaciones, tasa: tasas.cuentaIndividual },
        { concepto: conceptos.APORTE_RENTABILIDAD_PROTEGIDA, base: baseCotizaciones, tasa: tasas.rentabilidadProtegida }
    ]

    const aportes = calculos
        .map(({ concepto, base, tasa }) => ({ concepto, cantidad: null, monto: Math.round(base * tasa / 100) }))
        .concat(fijos.map(({ concepto, monto }) => ({ concepto, cantidad: null, monto })))
        .filter((aporte) => aporte.monto > 0)

    const totalAportes = aportes.reduce((suma, aporte) => suma + aporte.monto, 0)

    return { aportes, totalAportes }
}

// Bases de los aportes del empleador que siguen corriendo durante la licencia médica, sobre la renta imponible del mes
// anterior a la licencia proporcional a sus días (rimaMes):
// - SIS y expectativa de vida: renta del mes + RIMA, con el tope imponible de AFP.
// - Aporte del empleador al seguro de cesantía (2,4 % o 3 %): renta del mes + RIMA, con el tope del seguro de cesantía
//   (art. 8 Ley 19.728: la cotización de cargo del empleador la sigue pagando él; la del trabajador, 0,6 %, la paga la
//   entidad pagadora del subsidio). usadoCesantia: base ya usada en el mes por otra relación laboral.
// No corren durante la licencia (las paga la entidad pagadora del subsidio): cuenta individual (0,1 %) y rentabilidad
// protegida (0,9 %); siguen sobre la base de cotizaciones de los días pagados.
function basesConLicencia({ baseCotizaciones, baseCesantia, rimaMes, topeImponible, topeCesantia, usadoCesantia = 0 }) {
    return {
        baseSeguroSocial: Math.min(baseCotizaciones + rimaMes, topeImponible),
        baseCesantiaEmpleador: Math.min(baseCesantia + rimaMes, Math.max(0, topeCesantia - usadoCesantia))
    }
}

module.exports = {
    calcularAportesEmpleador,
    basesConLicencia
}