// Códigos de verificación en dos pasos (TOTP, RFC 6238), sin librerías externas.
//
// El servidor y la app del celular comparten un secreto (se entrega una vez, en el código QR).
// Con ese secreto y la hora, ambos calculan el mismo número de 6 dígitos, que cambia cada 30 segundos.
// Parámetros fijos: HMAC-SHA1, 6 dígitos y 30 segundos, que son los que entienden todas las apps
// (Google Authenticator, Microsoft Authenticator, etc.).
const crypto = require("crypto")

const DIGITOS = 6
const PERIODO_SEGUNDOS = 30
const BYTES_SECRETO = 20
// Se acepta el código del intervalo anterior y del siguiente, por si el reloj del celular está un poco corrido.
const TOLERANCIA_PASOS = 1
const EMISOR = "GestorRH"

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

// Base32 (RFC 4648) sin relleno "=": es el formato en que las apps esperan el secreto.
function base32Codificar(buffer) {
    let bits = 0
    let valor = 0
    let texto = ""

    for (const byte of buffer) {
        valor = (valor << 8) | byte
        bits += 8
        while (bits >= 5) {
            texto += ALFABETO_BASE32[(valor >>> (bits - 5)) & 31]
            bits -= 5
        }
    }
    if (bits > 0) {
        texto += ALFABETO_BASE32[(valor << (5 - bits)) & 31]
    }
    return texto
}

// Acepta minúsculas, espacios y "=" (por si el secreto se copió a mano). Un carácter inválido lanza error.
function base32Decodificar(texto) {
    const limpio = String(texto ?? "").toUpperCase().replace(/[\s=]/g, "")
    let bits = 0
    let valor = 0
    const bytes = []

    for (const caracter of limpio) {
        const indice = ALFABETO_BASE32.indexOf(caracter)
        if (indice === -1) {
            throw new Error("El secreto no está en base32")
        }
        valor = (valor << 5) | indice
        bits += 5
        if (bits >= 8) {
            bytes.push((valor >>> (bits - 8)) & 255)
            bits -= 8
        }
    }
    return Buffer.from(bytes)
}

// Secreto nuevo de 160 bits (el largo que recomienda el RFC para SHA-1), en base32.
function generarSecreto() {
    return base32Codificar(crypto.randomBytes(BYTES_SECRETO))
}

// Número del intervalo de 30 segundos en que cae un instante (en milisegundos).
function pasoDe(ahoraMs) {
    return Math.floor(ahoraMs / 1000 / PERIODO_SEGUNDOS)
}

function codigoEnPaso(secreto, paso) {
    const contador = Buffer.alloc(8)
    contador.writeBigUInt64BE(BigInt(paso))

    const hmac = crypto.createHmac("sha1", base32Decodificar(secreto)).update(contador).digest()

    // "Truncado dinámico" del RFC 4226: los 4 bits finales indican desde qué byte se toman 4 bytes.
    const desde = hmac[hmac.length - 1] & 0x0f
    const numero = hmac.readUInt32BE(desde) & 0x7fffffff

    return String(numero % 10 ** DIGITOS).padStart(DIGITOS, "0")
}

function normalizarCodigo(codigo) {
    return String(codigo ?? "").replace(/\s/g, "")
}

// Devuelve { valido, paso }. "paso" es el intervalo que calzó: hay que guardarlo como último usado,
// para que el mismo código no sirva dos veces (ni siquiera dentro de sus 30 segundos).
function verificarTotp(secreto, codigo, ahoraMs, ultimoPaso = null) {
    const texto = normalizarCodigo(codigo)
    if (!/^\d{6}$/.test(texto)) {
        return { valido: false, paso: null }
    }

    const ultimo = ultimoPaso === null || ultimoPaso === undefined ? null : Number(ultimoPaso)
    const pasoActual = pasoDe(ahoraMs)
    const enviado = Buffer.from(texto)

    for (let delta = -TOLERANCIA_PASOS; delta <= TOLERANCIA_PASOS; delta++) {
        const paso = pasoActual + delta
        if (ultimo !== null && paso <= ultimo) {
            continue
        }
        const esperado = Buffer.from(codigoEnPaso(secreto, paso))
        // Comparación en tiempo constante: no revela cuántos dígitos acertó.
        if (crypto.timingSafeEqual(enviado, esperado)) {
            return { valido: true, paso }
        }
    }
    return { valido: false, paso: null }
}

// Dirección que va dentro del código QR.
function uriOtpauth(email, secreto) {
    const etiqueta = `${encodeURIComponent(EMISOR)}:${encodeURIComponent(email)}`
    const parametros = new URLSearchParams({
        secret: secreto,
        issuer: EMISOR,
        algorithm: "SHA1",
        digits: String(DIGITOS),
        period: String(PERIODO_SEGUNDOS)
    })
    return `otpauth://totp/${etiqueta}?${parametros.toString()}`
}

// "ABCD EFGH IJKL ...": más fácil de leer y escribir a mano en la app.
function agruparSecreto(secreto) {
    return String(secreto).match(/.{1,4}/g).join(" ")
}

module.exports = {
    base32Codificar,
    base32Decodificar,
    generarSecreto,
    pasoDe,
    codigoEnPaso,
    verificarTotp,
    uriOtpauth,
    agruparSecreto,
    DIGITOS,
    PERIODO_SEGUNDOS
}
