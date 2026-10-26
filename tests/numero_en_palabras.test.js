const test = require("node:test")
const assert = require("node:assert")
const { pesosEnPalabras } = require("../src/shared/numero_en_palabras.js")

const CASOS = [
    [868133, "ochocientos sesenta y ocho mil ciento treinta y tres pesos"],
    [1, "un peso"],
    [21, "veintiún pesos"],
    [100, "cien pesos"],
    [101, "ciento un pesos"],
    [16, "dieciséis pesos"],
    [45, "cuarenta y cinco pesos"],
    [1000, "mil pesos"],
    [21000, "veintiún mil pesos"],
    [31000, "treinta y un mil pesos"],
    [100000, "cien mil pesos"],
    [1000000, "un millón de pesos"],
    [2000000, "dos millones de pesos"],
    [2500000, "dos millones quinientos mil pesos"],
    [21021021, "veintiún millones veintiún mil veintiún pesos"],
    [0, "cero pesos"]
]

for (const [monto, esperado] of CASOS) {
    test(`${monto} → ${esperado}`, () => {
        assert.strictEqual(pesosEnPalabras(monto), esperado)
    })
}

test("un número fuera de rango o con decimales lanza un error", () => {
    assert.throws(() => pesosEnPalabras(1000000000))
    assert.throws(() => pesosEnPalabras(10.5))
    assert.throws(() => pesosEnPalabras(-1))
})