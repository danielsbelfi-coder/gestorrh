const test = require("node:test")
const assert = require("node:assert/strict")
const { problemasDePassword } = require("../src/shared/politica_password.js")

const contexto = { email: "daniela.rojas@cliente.cl", nombre: "Daniela Rojas" }

test("acepta frases largas sin exigir mayúsculas, números ni símbolos", () => {
    assert.deepEqual(problemasDePassword("mi gato duerme en la ventana", contexto), [])
    assert.deepEqual(problemasDePassword("Tres perros cruzan el río Maipo", contexto), [])
    assert.deepEqual(problemasDePassword("café con pan amasado y palta", contexto), [])
})

test("exige 15 caracteres como mínimo", () => {
    assert.match(problemasDePassword("Corta!2026", contexto)[0], /al menos 15/)
    assert.match(problemasDePassword("catorce letras", contexto)[0], /al menos 15/)
    assert.deepEqual(problemasDePassword("quince letras ya", contexto), [])
})

test("rechaza más de 64 caracteres o más de 72 bytes (límite de bcrypt)", () => {
    assert.match(problemasDePassword("a b c d e f g h ".repeat(5), contexto)[0], /máximo 64/)
    assert.match(problemasDePassword("ñandú pingüino ñoño ".repeat(3) + "árbol", contexto)[0], /máximo 64/)
})

test("rechaza secuencias, repeticiones y contraseñas conocidas", () => {
    for (const mala of ["123456789012345", "qwertyuiopasdfgh", "543210987654321", "passwordpassword",
        "holaholaholahola", "aaaaaaaaaaaaaaaa", "abababababababab", "Contraseña12345", "1qaz2wsx3edc4rfv"]) {
        assert.equal(problemasDePassword(mala, contexto).length > 0, true, mala)
    }
})

test("rechaza el correo, el nombre o el nombre del sistema dentro de la contraseña", () => {
    assert.match(problemasDePassword("daniela vive en santiago", contexto).join(), /correo, tu nombre/)
    assert.match(problemasDePassword("las rojas flores del parque", contexto).join(), /correo, tu nombre/)
    assert.match(problemasDePassword("mi clave de GestorRH segura", contexto).join(), /nombre del sistema/)
})

test("no acepta espacios al inicio o al final ni valores que no son texto", () => {
    assert.match(problemasDePassword(" frase con espacio al inicio", contexto)[0], /espacios/)
    assert.equal(problemasDePassword(undefined, contexto).length, 1)
    assert.equal(problemasDePassword(123456789012345, contexto).length, 1)
})
