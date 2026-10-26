function calcularAportesEmpleador({ baseCotizaciones, baseCesantia, tasas, conceptos }) {
    const calculos = [
        { concepto: conceptos.APORTE_CESANTIA, base: baseCesantia, tasa: tasas.cesantia },
        { concepto: conceptos.APORTE_MUTUAL, base: baseCotizaciones, tasa: tasas.mutual },
        { concepto: conceptos.APORTE_SANNA, base: baseCotizaciones, tasa: tasas.sanna },
        { concepto: conceptos.APORTE_SIS, base: baseCotizaciones, tasa: tasas.sis },
        { concepto: conceptos.APORTE_EXPECTATIVA_VIDA, base: baseCotizaciones, tasa: tasas.expectativaVida },
        { concepto: conceptos.APORTE_CUENTA_INDIVIDUAL, base: baseCotizaciones, tasa: tasas.cuentaIndividual },
        { concepto: conceptos.APORTE_RENTABILIDAD_PROTEGIDA, base: baseCotizaciones, tasa: tasas.rentabilidadProtegida }
    ]

    const aportes = calculos
        .map(({ concepto, base, tasa }) => ({ concepto, cantidad: null, monto: Math.round(base * tasa / 100) }))
        .filter((aporte) => aporte.monto > 0)

    const totalAportes = aportes.reduce((suma, aporte) => suma + aporte.monto, 0)

    return { aportes, totalAportes }
}

module.exports = {
    calcularAportesEmpleador
}