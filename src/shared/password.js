const crypto = require("crypto")
const bcrypt = require("bcrypt")


async function generarPasswordInicial() {
    const password = crypto.randomBytes(9).toString("base64url")
    const hash = await bcrypt.hash(password, 10)

    return { password, hash }
}

module.exports = { generarPasswordInicial }