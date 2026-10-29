// Cifrado de datos guardados en la base (por ahora, el secreto del 2FA de cada usuario).
//
// AES-256-GCM: cifra y además detecta cualquier alteración (si alguien cambia un solo byte, descifrar falla).
// Formato guardado: "v1:<iv>:<tag>:<datos>" en base64url. La versión permite cambiar la clave en el futuro.
// "contexto" (por ejemplo "usuario:15") va como dato asociado: el texto cifrado de un usuario
// no sirve si se copia a otro usuario en la base.
const crypto = require("crypto")

const ALGORITMO = "aes-256-gcm"
const VERSION = "v1"
const BYTES_CLAVE = 32
const BYTES_IV = 12
const BYTES_TAG = 16

// Convierte el valor de la variable de entorno (base64url) en la clave. Lanza error si no son 32 bytes.
function leerClave(texto) {
    const valor = String(texto ?? "").trim()
    const clave = /^[A-Za-z0-9_-]+$/.test(valor) ? Buffer.from(valor, "base64url") : Buffer.alloc(0)

    if (clave.length !== BYTES_CLAVE) {
        throw new Error("TOTP_CLAVE_CIFRADO debe ser una clave de 32 bytes en base64url. Generar una: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"")
    }
    return clave
}

function cifrar(texto, clave, contexto = "") {
    const iv = crypto.randomBytes(BYTES_IV)
    const cifrador = crypto.createCipheriv(ALGORITMO, clave, iv)
    cifrador.setAAD(Buffer.from(String(contexto)))

    const datos = Buffer.concat([cifrador.update(String(texto), "utf8"), cifrador.final()])
    const tag = cifrador.getAuthTag()

    return [VERSION, iv.toString("base64url"), tag.toString("base64url"), datos.toString("base64url")].join(":")
}

// Cualquier problema (formato, clave distinta, contexto distinto, dato alterado) lanza el mismo error,
// sin detalles que ayuden a quien intenta adivinar.
function descifrar(textoCifrado, clave, contexto = "") {
    try {
        const partes = String(textoCifrado ?? "").split(":")
        if (partes.length !== 4 || partes[0] !== VERSION) {
            throw new Error("formato")
        }
        const iv = Buffer.from(partes[1], "base64url")
        const tag = Buffer.from(partes[2], "base64url")
        const datos = Buffer.from(partes[3], "base64url")
        if (iv.length !== BYTES_IV || tag.length !== BYTES_TAG) {
            throw new Error("formato")
        }

        const descifrador = crypto.createDecipheriv(ALGORITMO, clave, iv, { authTagLength: BYTES_TAG })
        descifrador.setAAD(Buffer.from(String(contexto)))
        descifrador.setAuthTag(tag)

        return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString("utf8")
    } catch {
        throw new Error("No se pudo descifrar el dato")
    }
}

module.exports = { leerClave, cifrar, descifrar, BYTES_CLAVE }
