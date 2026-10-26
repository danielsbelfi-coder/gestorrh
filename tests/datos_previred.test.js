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
            aportes: { rimaMes: 0, baseSeguroSocial: 1072299 },
            diasPago: { inasistencia: 1, permisoSinGoce: 0 },
            licencias: [{ fecha_inicio: "2027-07-15", fecha_termino: "2027-07-16", tipo: "comun", pagador_rut: "61603000", pagador_dv: "0", rima: 0 }]
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

test("borrador, marcas que no calzan y edad límite", () => {
    const liquidacion = {
        ...entrada.liquidacion,
        estado: "calculada",
        Trabajador: {
            ...entrada.liquidacion.Trabajador,
            Persona: { ...entrada.liquidacion.Trabajador.Persona, fecha_nacimiento: "1967-06-30" }
        }
    }

    const problemas = problemasPrevired(revision({ liquidacion, fechasInasistencia: [] }))

    assert.strictEqual(problemas.length, 3)
    assert.match(problemas[0], /borrador/)
    assert.match(problemas[1], /1 día\(s\) de inasistencia, pero hay 0/)
    assert.match(problemas[2], /Tiene 60 años/)
})

test("liquidación con formato anterior: un solo problema y no revisa lo demás", () => {
    const liquidacion = { ...entrada.liquidacion, detalle_calculo: { cotizaciones: {} } }

    assert.deepStrictEqual(problemasPrevired(revision({ liquidacion })), ["La liquidación se calculó con un formato anterior; recalcúlela"])
})

test("edad: un día antes del cumpleaños todavía no cumple", () => {
    const persona = { ...entrada.liquidacion.Trabajador.Persona, fecha_nacimiento: "1967-07-02" }
    const liquidacion = { ...entrada.liquidacion, Trabajador: { ...entrada.liquidacion.Trabajador, Persona: persona } }

    assert.deepStrictEqual(problemasPrevired(revision({ liquidacion })), [])
})