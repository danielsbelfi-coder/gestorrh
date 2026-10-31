const test = require("node:test")
const assert = require("node:assert/strict")
const { bancoDeTexto, motivoSinTransferencia } = require("../src/shared/bancos.js")

test("bancoDeTexto: código o nombre, con alias", () => {
    assert.equal(bancoDeTexto("12"), "012")
    assert.equal(bancoDeTexto("037"), "037")
    assert.equal(bancoDeTexto("999"), null)
    assert.equal(bancoDeTexto("Banco del Estado de Chile"), "012")
    assert.equal(bancoDeTexto("BancoEstado"), "012")
    assert.equal(bancoDeTexto("Cuenta RUT"), "012")
    assert.equal(bancoDeTexto("Banco de Chile"), "001")
    assert.equal(bancoDeTexto("banco itaú"), "039")
    assert.equal(bancoDeTexto("MACH"), "016")
    assert.equal(bancoDeTexto("Coopeuch"), "672")
    assert.equal(bancoDeTexto("Mercado Pago"), "875")
    assert.equal(bancoDeTexto("Prepago Los Héroes"), "152")
    assert.equal(bancoDeTexto("Banco Inventado"), null)
    assert.equal(bancoDeTexto(""), null)
    assert.equal(bancoDeTexto(null), null)
})

test("motivoSinTransferencia: forma de pago y datos incompletos", () => {
    const completa = { forma_pago: "transferencia", banco_codigo: "012", tipo_cuenta: "cuenta Rut", numero_cuenta: "12345678" }
    assert.equal(motivoSinTransferencia(completa), null)
    assert.equal(motivoSinTransferencia({ ...completa, forma_pago: "efectivo" }), "Forma de pago: efectivo")
    assert.equal(motivoSinTransferencia({ ...completa, banco_codigo: null, numero_cuenta: " " }), "Faltan datos bancarios: banco, número de cuenta")
})
