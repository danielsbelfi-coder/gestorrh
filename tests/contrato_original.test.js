const test = require("node:test")
const assert = require("node:assert/strict")
const { contratoOriginal, fechaTerminoVigente } = require("../src/contratos/contrato_original.js")

const anexo = (id, campo, anterior, nuevo, estado = "firmado") => ({ id, campo_modificado: campo, valor_anterior: anterior, valor_nuevo: nuevo, estado_firma: estado, fecha_firma: `2026-10-${String(id).padStart(2, "0")}` })

test("contratoOriginal: el valor anterior del primer anexo firmado de cada campo", () => {
    const vigente = { id: 1, tipo_contrato: "indefinido", fecha_termino: "2026-12-31", sueldo_base: "950000", horas_semanales: "42" }
    const original = contratoOriginal(vigente, [
        anexo(2, "fecha_termino", "2026-10-15", "2026-12-31"),
        anexo(3, "sueldo_base", "800000", "900000"),
        anexo(5, "sueldo_base", "900000", "950000"),
        anexo(6, "tipo_contrato", "plazo_fijo", "indefinido"),
        anexo(7, "horas_semanales", "42", "40", "pendiente")
    ])
    assert.deepEqual(original, { id: 1, tipo_contrato: "plazo_fijo", fecha_termino: "2026-10-15", sueldo_base: "800000", horas_semanales: "42" })
    assert.equal(vigente.tipo_contrato, "indefinido")
})

test("fechaTerminoVigente: ninguna si pasó a indefinido", () => {
    assert.equal(fechaTerminoVigente({ tipo_contrato: "indefinido", fecha_termino: "2026-10-15" }), null)
    assert.equal(fechaTerminoVigente({ tipo_contrato: "plazo_fijo", fecha_termino: "2026-10-15" }), "2026-10-15")
})
