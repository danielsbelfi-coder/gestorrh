const test = require("node:test")
const assert = require("node:assert")
const { contratoDelMes } = require("../src/remuneraciones/contrato_del_mes.js")

const contrato = { sueldo_base: "700000.00", horas_semanales: 42, tipo_jornada: "completa" }

const anexo = (id, campo, anterior, nuevo, vigencia, estado = "firmado") => ({
    id, campo_modificado: campo, valor_anterior: anterior, valor_nuevo: nuevo, fecha_vigencia: vigencia, estado_firma: estado
})

test("sin anexos: el contrato tal cual y un solo tramo", () => {
    const resultado = contratoDelMes({ contrato, anexos: [], anio: 2027, mes: 2 })

    assert.deepStrictEqual(resultado.contrato, contrato)
    assert.deepStrictEqual(resultado.tramosSueldo, [{ desdeDia: 1, sueldo: 700000 }])
})

test("aumento desde marzo: febrero reliquidado en abril usa el sueldo anterior", () => {
    const anexos = [anexo(1, "sueldo_base", "600000", "700000", "2027-03-01")]

    assert.deepStrictEqual(contratoDelMes({ contrato, anexos, anio: 2027, mes: 2 }).tramosSueldo, [{ desdeDia: 1, sueldo: 600000 }])
    assert.deepStrictEqual(contratoDelMes({ contrato, anexos, anio: 2027, mes: 3 }).tramosSueldo, [{ desdeDia: 1, sueldo: 700000 }])
})

test("aumento desde el 15 de marzo: dos tramos, y el contrato del mes queda con el sueldo final", () => {
    const anexos = [anexo(1, "sueldo_base", "600000", "700000", "2027-03-15")]
    const resultado = contratoDelMes({ contrato, anexos, anio: 2027, mes: 3 })

    assert.deepStrictEqual(resultado.tramosSueldo, [{ desdeDia: 1, sueldo: 600000 }, { desdeDia: 15, sueldo: 700000 }])
    assert.strictEqual(resultado.contrato.sueldo_base, "700000")
})

test("dos aumentos: abril queda con el del medio; los pendientes y rechazados no cuentan", () => {
    const anexos = [
        anexo(1, "sueldo_base", "600000", "700000", "2027-03-01"),
        anexo(2, "sueldo_base", "700000", "800000", "2027-05-01"),
        anexo(3, "sueldo_base", "700000", "999999", "2027-04-10", "pendiente"),
        anexo(4, "sueldo_base", "700000", "888888", "2027-04-20", "rechazado")
    ]

    assert.deepStrictEqual(contratoDelMes({ contrato, anexos, anio: 2027, mes: 4 }).tramosSueldo, [{ desdeDia: 1, sueldo: 700000 }])
})

test("otros campos: las horas quedan como al final del mes", () => {
    const anexos = [anexo(1, "horas_semanales", "40", "42", "2027-03-10")]

    assert.strictEqual(contratoDelMes({ contrato, anexos, anio: 2027, mes: 2 }).contrato.horas_semanales, "40")
    assert.strictEqual(contratoDelMes({ contrato, anexos, anio: 2027, mes: 3 }).contrato.horas_semanales, "42")
    assert.strictEqual(contratoDelMes({ contrato, anexos, anio: 2027, mes: 3 }).contrato.tipo_jornada, "completa")
})