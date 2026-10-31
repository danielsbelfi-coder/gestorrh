const test = require("node:test")
const assert = require("node:assert")
const { datosPrevired, problemasPrevired } = require("../src/remuneraciones/datos_previred.js")
const { lineasTrabajador } = require("../src/remuneraciones/archivo_previred.js")

const lineas = [
    ["AFP", "123850.00"], ["SALUD", "75061.00"], ["CESANTIA", "6434.00"],
    ["APORTE_CUENTA_INDIVIDUAL", "1072.00"], ["APORTE_SIS", "19087.00"], ["APORTE_EXPECTATIVA_VIDA", "7721.00"],
    ["APORTE_RENTABILIDAD_PROTEGIDA", "9651.00"], ["APORTE_MUTUAL", "19837.00"], ["APORTE_SANNA", "322.00"],
    ["APORTE_CESANTIA", "25735.00"]
].map(([codigo, monto]) => ({ codigo, monto }))

const entrada = {
    anio: 2027,
    mes: 7,
    limitesTramo: { a: 649039, b: 947990, c: 1478539 },
    codigoMutual: "01",
    tipoJornada: "completa",
    fechasInasistencia: ["2027-07-12"],
    fechasPermisoSinGoce: [],
    liquidacion: {
        estado: "emitida",
        dias_trabajados: 27,
        snapshot_contrato: { tipo_contrato: "indefinido" },
        detalle_calculo: {
            cotizaciones: { rentaImponible: 1072299, baseCotizaciones: 1072299 },
            salud: { sistema: "Fonasa", planUF: 0 },
            cesantia: { base: 1072299 },
            cotizante: { tipo: 0 },
            aportes: { rimaMes: 0, baseSeguroSocial: 1072299 },
            diasPago: { inasistencia: 1, permisoSinGoce: 0 },
            licencias: [{ fecha_inicio: "2027-07-15", fecha_termino: "2027-07-16", tipo: "comun", pagador_rut: "61603000", pagador_dv: "0", rima: 0 }],
        },
        LiquidacionLineas: lineas,
        Trabajador: {
            fecha_ingreso: "2020-03-01",
            fecha_termino: null,
            Persona: {
                rut: "88888888", dv: "8", apellido_paterno: "Soto", apellido_materno: null, nombres: "Ana",
                sexo_genero: "femenino", nacionalidad: "chilena", fecha_nacimiento: "1990-05-15",
                Afp: { codigo_previred: "08" }, Isapre: null
            }
        }
    }
}

test("de la liquidación a los datos: montos por código, tramo, mutual con SANNA, pagador y movimientos", () => {
    const datos = datosPrevired(entrada)

    assert.strictEqual(datos.prevision.afp, 123850)
    assert.strictEqual(datos.prevision.salud.codigoIsapre, null)
    assert.strictEqual(datos.trabajador.tramo, "C")
    assert.strictEqual(datos.empleador.mutual.monto, 20159)
    assert.deepStrictEqual(datos.empleador.pagador, { rut: "61603000", dv: "0" })
    assert.deepStrictEqual(datos.movimientos, [
        { codigo: 11, desde: "2027-07-12", hasta: "2027-07-12" },
        { codigo: 3, desde: "2027-07-15", hasta: "2027-07-16" }
    ])
    assert.strictEqual(datos.trabajador.tipoCotizante, 0)
})

test("de punta a punta: la liquidación de Ana da una línea 00 y una 01", () => {
    const [principal, adicional] = lineasTrabajador(datosPrevired(entrada)).map((linea) => linea.split(";"))

    assert.strictEqual(principal[27], "124922")
    assert.strictEqual(principal[97], "20159")
    assert.strictEqual(adicional[14], "3")
})

const revision = (cambios = {}) => ({
    liquidacion: entrada.liquidacion,
    primerDia: "2027-07-01",
    fechasInasistencia: entrada.fechasInasistencia,
    fechasPermisoSinGoce: [],
    ...cambios
})

test("sin problemas: Ana de julio está lista para el archivo", () => {
    assert.deepStrictEqual(problemasPrevired(revision()), [])
})

test("borrador y marcas que no calzan", () => {
    const liquidacion = {
        ...entrada.liquidacion,
        estado: "calculada",
        Trabajador: {
            ...entrada.liquidacion.Trabajador,
            Persona: { ...entrada.liquidacion.Trabajador.Persona, fecha_nacimiento: "1967-06-30" }
        }
    }

    const problemas = problemasPrevired(revision({ liquidacion, fechasInasistencia: [] }))

    assert.strictEqual(problemas.length, 2)
    assert.match(problemas[0], /borrador/)
    assert.match(problemas[1], /1 día\(s\) de inasistencia, pero hay 0/)
})

test("liquidación con formato anterior: un solo problema y no revisa lo demás", () => {
    const liquidacion = { ...entrada.liquidacion, detalle_calculo: { cotizaciones: {} } }

    assert.deepStrictEqual(problemasPrevired(revision({ liquidacion })), ["La liquidación se calculó con un formato anterior; recalcúlela"])
})

test("la edad ya no bloquea: una persona de 70 años sin problemas de datos está lista", () => {
    const persona = { ...entrada.liquidacion.Trabajador.Persona, fecha_nacimiento: "1957-01-10" }
    const liquidacion = { ...entrada.liquidacion, Trabajador: { ...entrada.liquidacion.Trabajador, Persona: persona } }

    assert.deepStrictEqual(problemasPrevired(revision({ liquidacion })), [])
})
test("cargas familiares: tramo y cargas guardados en la liquidación, montos en 22, 23 y 24", () => {
    const conCargas = structuredClone(entrada)
    conCargas.liquidacion.detalle_calculo.asignacionFamiliar = { tramo: "B", simples: 2, maternales: 0, invalidez: 1, unitario: 13870, monto: 55480 }
    conCargas.liquidacion.LiquidacionLineas = [
        ...lineas,
        { codigo: "ASIGNACION_FAMILIAR", monto: "55480.00" },
        { codigo: "ASIGNACION_FAMILIAR_RETROACTIVA", monto: "27740.00" },
        { codigo: "REINTEGRO_CARGAS_FAMILIARES", monto: "13870.00" }
    ]
    const [principal] = lineasTrabajador(datosPrevired(conCargas)).map((linea) => linea.split(";"))

    // Campos 18 a 24 (posiciones 17 a 23): tramo, simples, maternales, invalidez, asignación, retroactiva, reintegro.
    assert.deepStrictEqual(principal.slice(17, 24), ["B", "2", "0", "1", "55480", "27740", "13870"])
})

test("cargas familiares: sin tramo registrado va D; una liquidación antigua sigue con el tramo por renta", () => {
    const sinTramo = structuredClone(entrada)
    sinTramo.liquidacion.detalle_calculo.asignacionFamiliar = { tramo: null, simples: 0, maternales: 0, invalidez: 0, unitario: 0, monto: 0 }
    assert.strictEqual(datosPrevired(sinTramo).trabajador.tramo, "D")

    const antigua = datosPrevired(entrada).trabajador
    assert.deepStrictEqual([antigua.tramo, antigua.cargasSimples, antigua.asignacion], ["C", 0, 0])
})

test("CCAF y APV: datos desde lo guardado en la liquidación, y problemas", () => {
    const con = structuredClone(entrada)
    con.liquidacion.detalle_calculo.ccaf = { caja: "los_andes", saludCcaf: 45037 }
    con.liquidacion.detalle_calculo.apv = {
        apvi: { institucionCodigo: "033", numeroContrato: "C1", formaPago: 1, regimen: "B", monto: 80000 },
        apvc: null,
        depositoConvenido: { institucionCodigo: "005", numeroContrato: null, formaPago: 1, monto: 40000 }
    }
    con.liquidacion.LiquidacionLineas = [...lineas, { codigo: "CCAF_CREDITO_PERSONAL", monto: "25000.00" }, { codigo: "CCAF_DENTAL", monto: "4000.00" }]
    const datos = datosPrevired(con)
    assert.deepStrictEqual([datos.ccaf.codigo, datos.ccaf.saludCcaf, datos.ccaf.descuentos[85], datos.ccaf.descuentos[86]], ["01", 45037, 25000, 4000])
    assert.deepStrictEqual(datos.ahorro.apvi, { institucionCodigo: "033", numeroContrato: "C1", formaPago: 1, monto: 80000, depositoConvenido: 40000 })

    const problemas = problemasPrevired({ liquidacion: con.liquidacion, primerDia: "2027-07-01", fechasInasistencia: entrada.fechasInasistencia, fechasPermisoSinGoce: [] })
    assert.ok(problemas.some((p) => /descuento dental/.test(p)), problemas.join(" | "))
    assert.ok(problemas.some((p) => /misma institución/.test(p)), problemas.join(" | "))
})

test("CCAF y APV: una liquidación antigua no informa caja ni APV", () => {
    const datos = datosPrevired(entrada)
    assert.strictEqual(datos.ccaf.codigo, null)
    assert.deepStrictEqual(datos.ahorro, { apvi: null, apvc: null })
})

test("técnico extranjero (Ley 18.156): SIP, AFP 00, sin renta de AFP; salud con su renta", () => {
    const sinAfp = lineas.filter((l) => !["AFP", "APORTE_CUENTA_INDIVIDUAL", "APORTE_SIS", "APORTE_EXPECTATIVA_VIDA", "APORTE_RENTABILIDAD_PROTEGIDA"].includes(l.codigo))
    const tecnico = {
        ...entrada,
        liquidacion: {
            ...entrada.liquidacion,
            LiquidacionLineas: sinAfp,
            detalle_calculo: { ...entrada.liquidacion.detalle_calculo, cotizante: { tipo: 8, tecnicoExtranjero: true } },
            Trabajador: { ...entrada.liquidacion.Trabajador, Persona: { ...entrada.liquidacion.Trabajador.Persona, nacionalidad: "extranjera", Afp: null } }
        }
    }
    const [principal] = lineasTrabajador(datosPrevired(tecnico)).map((linea) => linea.split(";"))
    assert.deepStrictEqual([principal[10], principal[11], principal[25], principal[26], principal[27], principal[28]], ["SIP", "8", "00", "0", "0", "0"])
    assert.strictEqual(principal[63], "1072299")
    assert.deepStrictEqual(problemasPrevired({ liquidacion: tecnico.liquidacion, primerDia: "2027-07-01", fechasInasistencia: entrada.fechasInasistencia, fechasPermisoSinGoce: [] }), [])
})
