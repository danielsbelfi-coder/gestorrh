const crypto = require("crypto")
const bcrypt = require("bcrypt")

// Sin 0/O ni 1/l/I: la contraseña inicial se lee, se copia o se dicta, y esos caracteres se confunden.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"

function grupoAleatorio(largo) {
    let texto = ""
    for (let i = 0; i < largo; i++) {
        texto += ALFABETO[crypto.randomInt(ALFABETO.length)]
    }
    return texto
}

// Formato xxxx-xxxx-xxxx (12 caracteres al azar, unos 69 bits).
function generarPasswordLegible() {
    return `${grupoAleatorio(4)}-${grupoAleatorio(4)}-${grupoAleatorio(4)}`
}

async function generarPasswordInicial() {
    const password = generarPasswordLegible()
    const hash = await bcrypt.hash(password, 10)

    return { password, hash }
}

module.exports = { generarPasswordInicial, generarPasswordLegible }
