const test = require("node:test")
const assert = require("node:assert")
const { columnasLre, encabezadoLre, lineaLre, camposIdentificacionLre, camposMontosLre, lineasFiniquitoLre } = require("../src/remuneraciones/archivo_lre.js")

test("plantilla: 147 columnas con su código, sin repetidos, en el orden oficial", () => {
    const columnas = columnasLre()
    const codigos = columnas.map((columna) => columna.codigo)

    assert.strictEqual(columnas.length, 147)
    assert.strictEqual(new Set(codigos).size, 147)
    assert.strictEqual(codigos[0], 1101)
    assert.strictEqual(codigos[146], 5565)
    assert.strictEqual(columnas[1].nombre, "Fecha inicio contrato(1102)")
    assert.strictEqual(columnas[12].codigo, 1142)
    assert.strictEqual(columnas[64].nombre, "Sueldo empresarial (2161)")
    assert.strictEqual(columnas[104].codigo, 3166)
})

test("encabezado: las tildes se leen bien desde latin1", () => {
    assert.match(encabezadoLre(columnasLre()), /^Rut trabajador\(1101\);Fecha inicio contrato\(1102\);Fecha término de contrato\(1103\);/)
})

test("línea: cada valor en su columna, el 0 se escribe y lo demás queda vacío", () => {
    const columnas = columnasLre()
    const campos = lineaLre(columnas, { 1101: "88888888-8", 2101: 738000, 3144: 0 }).split(";")

    assert.strictEqual(campos.length, 147)
    assert.strictEqual(campos[0], "88888888-8")
    assert.strictEqual(campos[40], "738000")
    assert.strictEqual(campos[91], "0")
    assert.strictEqual(campos[1], "")
})

const ana = {
    rut: "88888888", dv: "8", fechaInicioContrato: "2020-03-01", fechaTermino: null, causalTermino: null, ultimoDia: "2027-07-31",
    comuna: "7301", tipoJornada: "completa", tipoPension: null, afpLre: 31, sistemaSalud: "Fonasa", isapreLre: null,
    cotizaCesantia: true, mutualLre: 1, tramo: "C", diasTrabajados: 27, diasLicencia: 2, diasVacaciones: 0
}

test("identificación: Ana de julio 2027", () => {
    const campos = camposIdentificacionLre(ana)

    assert.strictEqual(campos[1101], "88888888-8")
    assert.strictEqual(campos[1102], "01/03/2020")
    assert.strictEqual(campos[1103], "")
    assert.strictEqual(campos[1105], 7)
    assert.strictEqual(campos[1106], 7301)
    assert.strictEqual(campos[1107], 101)
    assert.deepStrictEqual([campos[1108], campos[1109]], [0, 0])
    assert.deepStrictEqual([campos[1141], campos[1143], campos[1151], campos[1152]], [31, 102, 1, 1])
    assert.deepStrictEqual([campos[1115], campos[1116], campos[1117]], [27, 2, ""])
})

test("identificación: término en el mes con su causal; uno futuro no se informa", () => {
    const enElMes = camposIdentificacionLre({ ...ana, fechaTermino: "2027-07-15", causalTermino: 4 })
    const futuro = camposIdentificacionLre({ ...ana, fechaTermino: "2027-09-30", causalTermino: 6 })

    assert.deepStrictEqual([enElMes[1103], enElMes[1104]], ["15/07/2027", 4])
    assert.deepStrictEqual([futuro[1103], futuro[1104]], ["", ""])
})

test("identificación: isapre, jornada excluida, pensionado por invalidez parcial, Valdivia en Los Ríos", () => {
    const campos = camposIdentificacionLre({
        ...ana, comuna: "10501", tipoJornada: "excluido_limitacion", tipoPension: "invalidez_parcial",
        sistemaSalud: "Isapre", isapreLre: 3, cotizaCesantia: false
    })

    assert.deepStrictEqual([campos[1105], campos[1106]], [14, 10501])
    assert.deepStrictEqual([campos[1107], campos[1108], campos[1109]], [701, 3, 0])
    assert.deepStrictEqual([campos[1143], campos[1151]], [3, 0])
})

const linea = (codigo, codigo_lre, tipo, monto) => ({ codigo, codigo_lre, tipo, monto })

test("montos: horas extra sumadas, atrasos rebajados del sueldo, totales por grupo y líquido", () => {
    const { valores, sinCodigo } = camposMontosLre([
        linea("SUELDO_BASE", 2101, "haber", 738000),
        linea("DESCUENTO_ATRASOS", 2101, "descuento", 2000),
        linea("HORAS_EXTRA_50", 2102, "haber", 30000),
        linea("HORAS_EXTRA_100", 2102, "haber", 10000),
        linea("GRATIFICACION", 2106, "haber", 194500),
        linea("COLACION", 2301, "haber", 40000),
        linea("AFP", 3141, "descuento", 110000),
        linea("SALUD", 3143, "descuento", 67000),
        linea("CESANTIA", 3151, "descuento", 5800),
        linea("ANTICIPO", 3188, "descuento", 100000),
        linea("APORTE_SIS", 4155, "aporte", 17000),
        linea("APORTE_MUTUAL", 4152, "aporte", 18000),
        linea("APORTE_SANNA", 4152, "aporte", 300),
        linea("APORTE_EXPECTATIVA_VIDA", null, "aporte", 7000)
    ])

    assert.deepStrictEqual(sinCodigo, [])
    assert.deepStrictEqual([valores[2101], valores[2102], valores[2106]], [736000, 40000, 194500])
    assert.deepStrictEqual([valores[5201], valores[5210], valores[5230]], [1010500, 970500, 40000])
    assert.deepStrictEqual([valores[5301], valores[5341], valores[5361], valores[5302]], [282800, 182800, 0, 100000])
    assert.deepStrictEqual([valores[3161], valores[4152], valores[5410]], [0, 18300, 35300])
    assert.strictEqual(valores[5501], 727700)
})

test("montos: el ajuste por pago en exceso se resta del 3188 y no es haber", () => {
    const { valores } = camposMontosLre([
        linea("SUELDO_BASE", 2101, "haber", 50000),
        linea("DESCUENTO_PAGO_EXCESO", 3188, "descuento", 80000),
        linea("AJUSTE_PAGO_EXCESO", null, "haber", 30000)
    ])

    assert.deepStrictEqual([valores[3188], valores[5201], valores[5501]], [50000, 50000, 0])
})

test("montos: un concepto propio sin código LRE se informa como faltante", () => {
    const { sinCodigo } = camposMontosLre([linea("BONO_ASISTENCIA", null, "haber", 20000)])

    assert.deepStrictEqual(sinCodigo, ["BONO_ASISTENCIA"])
})

test("finiquito en el LRE: indemnizaciones en 23xx, imputación en 3185, descuentos con su código y totales", () => {
    const finiquito = {
        monto_feriado: 314860, monto_anios_servicio: 2248920, monto_aviso_previo: 1124460, imputacion_afc: 400000,
        descuentos: [{ glosa: "Préstamo empresa", monto: 50000, codigo_lre: 3188 }]
    }
    const { valores } = camposMontosLre([
        linea("SUELDO_BASE", 2101, "haber", 410000),
        linea("AFP", 3141, "descuento", 46000),
        ...lineasFiniquitoLre(finiquito)
    ])

    assert.deepStrictEqual([valores[2313], valores[2314], valores[2315]], [314860, 2248920, 1124460])
    assert.deepStrictEqual([valores[3185], valores[3188]], [400000, 50000])
    assert.deepStrictEqual([valores[5502], valores[5565], valores[5564]], [3688240, 3688240, 0])
    assert.deepStrictEqual([valores[5201], valores[5230]], [4098240, 3688240])
    assert.strictEqual(valores[5302], 450000)
    assert.strictEqual(valores[5501], 3602240)
})

test("finiquito por renuncia: solo el feriado; sin filas en cero", () => {
    const lineas = lineasFiniquitoLre({ monto_feriado: 314860, monto_anios_servicio: 0, monto_aviso_previo: 0, imputacion_afc: 0, descuentos: [] })

    assert.deepStrictEqual(lineas.map((l) => l.codigo_lre), [2313])
})
test("identificación: cargas familiares por tipo y tramo; sin cargas van en 0", () => {
    const conCargas = camposIdentificacionLre({ ...ana, tramo: "A", cargasSimples: 2, cargasMaternales: 1, cargasInvalidez: 1 })
    assert.deepStrictEqual([conCargas[1111], conCargas[1112], conCargas[1113], conCargas[1114]], [2, 1, 1, "A"])

    const sinCargas = camposIdentificacionLre(ana)
    assert.deepStrictEqual([sinCargas[1111], sinCargas[1112], sinCargas[1113]], [0, 0, 0])
})

test("identificación: caja de compensación y marcas de APVI y APVC", () => {
    const con = camposIdentificacionLre({ ...ana, ccafLre: 3, apvi: true, apvc: false })
    assert.deepStrictEqual([con[1110], con[1155], con[1157]], [3, 1, 0])
    const sin = camposIdentificacionLre(ana)
    assert.deepStrictEqual([sin[1110], sin[1155], sin[1157]], [0, 0, 0])
})

test("técnico extranjero: 1141 = 100 (no está en AFP) y 1146 = 1", () => {
    const campos = camposIdentificacionLre({ ...ana, afpLre: 100, tecnicoExtranjero: true })
    assert.equal(campos[1141], 100)
    assert.equal(campos[1146], 1)
    assert.equal(camposIdentificacionLre(ana)[1146], 0)
})
