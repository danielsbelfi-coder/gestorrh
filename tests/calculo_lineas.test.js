const test = require("node:test")
const assert = require("node:assert")
const { calcularLineasBase, calcularLiquidacionPorLineas, buscarTramo } = require("../src/remuneraciones/calculo_lineas.js")

function concepto(codigo, tipo, marcas = {}) {
    return { codigo, tipo, imponible: false, tributable: false, base_gratificacion: false, recargo_hora_extra: null, ...marcas }
}

const IMPONIBLE_CON_GRATIFICACION = { imponible: true, tributable: true, base_gratificacion: true }

const CONCEPTOS = {
    SUELDO_BASE: concepto("SUELDO_BASE", "haber", IMPONIBLE_CON_GRATIFICACION),
    GRATIFICACION: concepto("GRATIFICACION", "haber", { imponible: true, tributable: true }),
    DESCUENTO_ATRASOS: concepto("DESCUENTO_ATRASOS", "descuento", IMPONIBLE_CON_GRATIFICACION),
    HORAS_EXTRA_50: concepto("HORAS_EXTRA_50", "haber", { ...IMPONIBLE_CON_GRATIFICACION, recargo_hora_extra: "50.00" }),
    BONO_PRODUCCION: concepto("BONO_PRODUCCION", "haber", IMPONIBLE_CON_GRATIFICACION),
    COLACION: concepto("COLACION", "haber"),
    ANTICIPO: concepto("ANTICIPO", "descuento"),
    AFP: concepto("AFP", "descuento"),
    SALUD: concepto("SALUD", "descuento"),
    CESANTIA: concepto("CESANTIA", "descuento"),
    IMPUESTO_UNICO: concepto("IMPUESTO_UNICO", "descuento"),
    DESCUENTO_PAGO_EXCESO: concepto("DESCUENTO_PAGO_EXCESO", "descuento"),
    AJUSTE_PAGO_EXCESO: concepto("AJUSTE_PAGO_EXCESO", "haber"),
    SALUD_ADICIONAL_ISAPRE: concepto("SALUD_ADICIONAL_ISAPRE", "descuento"),
    ASIGNACION_FAMILIAR: concepto("ASIGNACION_FAMILIAR", "haber"),
}

function calcular(datos) {
    return calcularLineasBase({
        horasSemanales: 42,
        diasPagados: 30,
        variables: [],
        minutosAtraso: 0,
        ingresoMinimoMensual: 1000000,
        conceptos: CONCEPTOS,
        ...datos
    })
}

function monto(resultado, codigo) {
    const linea = resultado.lineas.find((l) => l.concepto.codigo === codigo)
    return linea ? linea.monto : 0
}

test("tu ejemplo: sueldo, horas extra y bono entran en la gratificación; la colación no", () => {
    const resultado = calcular({
        sueldoBase: 900000,
        variables: [
            { concepto: CONCEPTOS.HORAS_EXTRA_50, cantidad: "4.00", monto: null },
            { concepto: CONCEPTOS.BONO_PRODUCCION, cantidad: null, monto: 50000 },
            { concepto: CONCEPTOS.COLACION, cantidad: null, monto: 40000 }
        ]
    })

    assert.strictEqual(resultado.valorHora, 5000)
    assert.strictEqual(monto(resultado, "HORAS_EXTRA_50"), 30000)
    assert.strictEqual(resultado.baseGratificacion, 980000)
    assert.strictEqual(monto(resultado, "GRATIFICACION"), 245000)
})

test("la gratificación se topa en 4,75 IMM / 12", () => {
    const resultado = calcular({ sueldoBase: 900000, ingresoMinimoMensual: 500000 })

    assert.strictEqual(monto(resultado, "GRATIFICACION"), 197917)
})

test("con 6 días a pago: sueldo proporcional y el mismo tope mensual", () => {
    const resultado = calcular({ sueldoBase: 900000, diasPagados: 6, ingresoMinimoMensual: 500000 })

    assert.strictEqual(monto(resultado, "SUELDO_BASE"), 180000)
    assert.strictEqual(monto(resultado, "GRATIFICACION"), 45000)
    assert.ok(Math.abs(resultado.topeGratificacion - 197916.67) < 0.01)
})

test("30 minutos de atraso: se descuentan al valor hora y rebajan la base de la gratificación", () => {
    const resultado = calcular({ sueldoBase: 900000, minutosAtraso: 30 })

    assert.strictEqual(monto(resultado, "DESCUENTO_ATRASOS"), 2500)
    assert.strictEqual(resultado.baseGratificacion, 897500)
    assert.strictEqual(monto(resultado, "GRATIFICACION"), 224375)
})

test("dos variables del mismo concepto quedan en una sola línea", () => {
    const resultado = calcular({
        sueldoBase: 900000,
        variables: [
            { concepto: CONCEPTOS.BONO_PRODUCCION, cantidad: null, monto: 20000 },
            { concepto: CONCEPTOS.BONO_PRODUCCION, cantidad: null, monto: 30000 }
        ]
    })

    const bonos = resultado.lineas.filter((l) => l.concepto.codigo === "BONO_PRODUCCION")
    assert.strictEqual(bonos.length, 1)
    assert.strictEqual(bonos[0].monto, 50000)
})

test("un anticipo no rebaja la base de la gratificación", () => {
    const resultado = calcular({
        sueldoBase: 900000,
        variables: [{ concepto: CONCEPTOS.ANTICIPO, cantidad: null, monto: 100000 }]
    })

    assert.strictEqual(resultado.baseGratificacion, 900000)
    assert.strictEqual(monto(resultado, "ANTICIPO"), 100000)
})

const TRAMOS = [
    { desdeUTM: 0, hastaUTM: 13.5, tasa: 0, rebajaUTM: 0 },
    { desdeUTM: 13.5, hastaUTM: 30, tasa: 4, rebajaUTM: 0.54 },
    { desdeUTM: 30, hastaUTM: 50, tasa: 8, rebajaUTM: 1.74 },
    { desdeUTM: 50, hastaUTM: null, tasa: 13.5, rebajaUTM: 4.49 }
]

function liquidar(datos) {
    return calcularLiquidacionPorLineas({
        horasSemanales: 42,
        diasPagados: 30,
        variables: [],
        minutosAtraso: 0,
        ingresoMinimoMensual: 500000,
        tasaAfp: 10,
        tasaSalud: 7,
        planSaludUF: 0,
        topeImponibleUF: 90,
        valorUF: 40000,
        valorUTM: 65000,
        tasaCesantia: 0.6,
        topeCesantiaUF: 135.2,
        tramos: TRAMOS,
        saldoPendiente: 0,
        conceptos: CONCEPTOS,
        ...datos
    })
}

test("liquidación completa: cotizaciones, impuesto y líquido", () => {
    const r = liquidar({ sueldoBase: 900000 })

    assert.strictEqual(r.rentaImponible, 1097917)
    assert.strictEqual(monto(r, "AFP"), 109792)
    assert.strictEqual(monto(r, "SALUD_ADICIONAL_ISAPRE"), 0)
    assert.strictEqual(monto(r, "SALUD"), 76854)
    assert.strictEqual(monto(r, "CESANTIA"), 6588)
    assert.strictEqual(r.baseTributable, 904683)
    assert.strictEqual(monto(r, "IMPUESTO_UNICO"), 1087)
    assert.strictEqual(r.liquidoAPagar, 903596)
})

test("isapre sobre el 7%: se descuenta el plan, pero la base tributable solo rebaja el 7%", () => {
    const r = liquidar({ sueldoBase: 900000, planSaludUF: 5 })

    assert.strictEqual(monto(r, "SALUD"), 76854)
    assert.strictEqual(monto(r, "SALUD_ADICIONAL_ISAPRE"), 123146)
    assert.strictEqual(r.descuentoSaludLegal, 76854)
    assert.strictEqual(r.baseTributable, 904683)
    assert.strictEqual(monto(r, "IMPUESTO_UNICO"), 1087)
    assert.strictEqual(r.liquidoAPagar, 780450)
})

test("sueldo alto: la base de cotizaciones se topa en 90 UF", () => {
    const r = liquidar({ sueldoBase: 5000000 })

    assert.strictEqual(r.baseCotizaciones, 3600000)
    assert.strictEqual(monto(r, "AFP"), 360000)
    assert.strictEqual(monto(r, "IMPUESTO_UNICO"), 323038)
    assert.strictEqual(r.liquidoAPagar, 4231691)
})

test("saldo pendiente del mes anterior: se descuenta como pago en exceso", () => {
    const r = liquidar({ sueldoBase: 900000, saldoPendiente: 50000 })

    assert.strictEqual(monto(r, "DESCUENTO_PAGO_EXCESO"), 50000)
    assert.strictEqual(r.liquidoAPagar, 853596)
})

test("líquido negativo: se cuadra en cero con el ajuste y queda saldo para el mes siguiente", () => {
    const r = liquidar({
        sueldoBase: 900000,
        variables: [{ concepto: CONCEPTOS.ANTICIPO, cantidad: null, monto: 1000000 }]
    })

    assert.strictEqual(monto(r, "AJUSTE_PAGO_EXCESO"), 96404)
    assert.strictEqual(r.liquidoAPagar, 0)
    assert.strictEqual(r.nuevoSaldoPendiente, 96404)
    assert.strictEqual(r.totalHaberes, r.totalDescuentos)
})

test("base de 13,55 UTM cae en el segundo tramo, sin hueco", () => {
    assert.strictEqual(buscarTramo(TRAMOS, 13.55).tasa, 4)
})

test("base exacta de 13,5 UTM: el límite inferior se incluye", () => {
    assert.strictEqual(buscarTramo(TRAMOS, 13.5).tasa, 4)
})

test("cesantía: se topa en 135,2 UF, distinto del tope imponible de 90 UF", () => {
    const r = liquidar({ sueldoBase: 10000000 })

    assert.strictEqual(r.baseCotizaciones, 3600000)
    assert.strictEqual(r.baseCesantia, 5408000)
    assert.strictEqual(monto(r, "CESANTIA"), 32448)
})

test("isapre bajo el 7%: se descuenta el 7% legal y no hay adicional", () => {
    const r = liquidar({ sueldoBase: 900000, planSaludUF: 1.5 })

    assert.strictEqual(monto(r, "SALUD"), 76854)
    assert.strictEqual(r.descuentoAdicionalIsapre, 0)
    assert.strictEqual(r.lineas.some((l) => l.concepto.codigo === "SALUD_ADICIONAL_ISAPRE"), false)
})

test("aumento a mitad de mes: sueldo por tramos y horas extra al valor hora del sueldo final", () => {
    const resultado = calcular({
        sueldoBase: 900000,
        tramosSueldo: [{ desdeDia: 1, sueldo: 800000, dias: 14 }, { desdeDia: 15, sueldo: 900000, dias: 16 }],
        variables: [{ concepto: CONCEPTOS.HORAS_EXTRA_50, cantidad: "4.00", monto: null }]
    })

    assert.strictEqual(monto(resultado, "SUELDO_BASE"), 853333)
    assert.strictEqual(resultado.valorHora, 5000)
    assert.strictEqual(monto(resultado, "HORAS_EXTRA_50"), 30000)
    assert.strictEqual(monto(resultado, "GRATIFICACION"), 220833)
})
test("asignación familiar: línea de haber con el número de cargas, fuera de la gratificación y de las bases", () => {
    const sin = calcular({ sueldoBase: 900000 })
    const con = calcular({ sueldoBase: 900000, asignacionFamiliar: { monto: 45202, cargas: 2 } })
    const linea = con.lineas.find((l) => l.concepto.codigo === "ASIGNACION_FAMILIAR")

    assert.deepStrictEqual({ cantidad: linea.cantidad, monto: linea.monto }, { cantidad: 2, monto: 45202 })
    assert.strictEqual(con.baseGratificacion, sin.baseGratificacion)
    assert.strictEqual(monto(calcular({ sueldoBase: 900000, asignacionFamiliar: { monto: 0, cargas: 1 } }), "ASIGNACION_FAMILIAR"), 0)
})

test("APV y depósito convenido: líneas, rebaja tributable del régimen B y líquido", () => {
    const conceptos = {
        ...CONCEPTOS,
        APVI_A: concepto("APVI_A", "descuento"), APVI_B: concepto("APVI_B", "descuento"),
        APVC_A: concepto("APVC_A", "descuento"), APVC_B: concepto("APVC_B", "descuento"),
        DEPOSITO_CONVENIDO: concepto("DEPOSITO_CONVENIDO", "haber"),
        DESCUENTO_DEPOSITO_CONVENIDO: concepto("DESCUENTO_DEPOSITO_CONVENIDO", "descuento")
    }
    const datos = {
        sueldoBase: 1500000, horasSemanales: 42, diasPagados: 30, variables: [], minutosAtraso: 0, ingresoMinimoMensual: 553553,
        tasaAfp: 11.44, tasaSalud: 7, planSaludUF: 0, topeImponibleUF: 90, valorUF: 40000, valorUTM: 70000, tasaCesantia: 0.6, topeCesantiaUF: 135.2,
        tramos: [{ desdeUTM: 0, hastaUTM: 13.5, tasa: 0, rebajaUTM: 0 }, { desdeUTM: 13.5, hastaUTM: 30, tasa: 4, rebajaUTM: 0.54 }, { desdeUTM: 30, hastaUTM: null, tasa: 8, rebajaUTM: 1.74 }],
        saldoPendiente: 0, conceptos
    }
    const sin = calcularLiquidacionPorLineas(datos)
    const con = calcularLiquidacionPorLineas({ ...datos, ahorros: [
        { tipo: "apvi", institucion_codigo: "033", institucion_nombre: "AFP Capital", forma_pago: 1, regimen: "B", modalidad: "pesos", monto: "100000" },
        { tipo: "deposito_convenido", institucion_codigo: "033", institucion_nombre: "AFP Capital", forma_pago: 1, regimen: null, modalidad: "pesos", monto: "50000" }
    ] })
    const monto = (r, codigo) => r.lineas.filter((l) => l.concepto.codigo === codigo).reduce((s, l) => s + l.monto, 0)

    assert.strictEqual(monto(con, "APVI_B"), 100000)
    assert.strictEqual(monto(con, "DEPOSITO_CONVENIDO"), 50000)
    assert.strictEqual(monto(con, "DESCUENTO_DEPOSITO_CONVENIDO"), 50000)
    assert.strictEqual(con.baseTributable, sin.baseTributable - 100000)
    assert.strictEqual(con.rentaImponible, sin.rentaImponible)
    const impuesto = (r) => monto(r, "IMPUESTO_UNICO")
    assert.ok(impuesto(con) < impuesto(sin))
    assert.strictEqual(con.liquidoAPagar, sin.liquidoAPagar - 100000 + (impuesto(sin) - impuesto(con)))

    const regimenA = calcularLiquidacionPorLineas({ ...datos, ahorros: [{ tipo: "apvi", institucion_codigo: "033", institucion_nombre: "X", forma_pago: 1, regimen: "A", modalidad: "pesos", monto: "100000" }] })
    assert.strictEqual(regimenA.baseTributable, sin.baseTributable)
    assert.strictEqual(monto(regimenA, "APVI_A"), 100000)
})
