// Códigos de recuperación del 2FA: se entregan una sola vez al activarlo y cada uno sirve para entrar una vez
// si el usuario no tiene su celular.
//
// Formato "xxxxx-xxxxx": 10 caracteres de un alfabeto de 31 (sin 0/o, 1/l/i), unos 49 bits al azar.
// Solo minúsculas: el usuario puede escribirlo con mayúsculas, guiones o espacios y se acepta igual.
// En la base se guarda solo su SHA-256: son aleatorios y largos, así que no necesitan bcrypt
// (bcrypt sirve para contraseñas elegidas por personas, que son adivinables).
const crypto = require("crypto")

const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"
const LARGO_GRUPO = 5
const CANTIDAD_POR_DEFECTO = 10

function grupoAleatorio() {
    let texto = ""
    for (let i = 0; i < LARGO_GRUPO; i++) {
        texto += ALFABETO[crypto.randomInt(ALFABETO.length)]
    }
    return texto
}

function generarCodigos(cantidad = CANTIDAD_POR_DEFECTO) {
    const codigos = new Set()
    while (codigos.size < cantidad) {
        codigos.add(`${grupoAleatorio()}-${grupoAleatorio()}`)
    }
    return [...codigos]
}

function normalizarCodigo(codigo) {
    return String(codigo ?? "").toLowerCase().replace(/[\s-]/g, "")
}

// Sirve para distinguir lo que escribió el usuario: 6 dígitos = código de la app; esto = código de recuperación.
function pareceCodigoRecuperacion(codigo) {
    const texto = normalizarCodigo(codigo)
    return texto.length === LARGO_GRUPO * 2 && [...texto].every((caracter) => ALFABETO.includes(caracter))
}

function hashCodigo(codigo) {
    return crypto.createHash("sha256").update(normalizarCodigo(codigo)).digest("hex")
}

module.exports = { generarCodigos, normalizarCodigo, pareceCodigoRecuperacion, hashCodigo, CANTIDAD_POR_DEFECTO }
