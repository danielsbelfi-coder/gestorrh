// Política de contraseñas elegidas por las personas (no las iniciales, que genera el sistema al azar).
//
// Sigue la guía NIST SP 800-63B (revisión 4, 2025) para contraseñas usadas como único factor:
// - Largo mínimo 15 caracteres. Sin reglas de composición (no se exige mayúscula, número ni símbolo):
//   una frase de varias palabras es más segura y fácil de recordar que "P@ssw0rd1".
// - Se aceptan espacios, tildes y cualquier carácter.
// - Se rechazan contraseñas conocidas o predecibles: listas de contraseñas comunes, secuencias de teclado,
//   repeticiones y las que contienen el correo, el nombre de la persona o el nombre del sistema.
// - Sin vencimiento periódico: solo se cambia si la persona quiere o si hay sospecha de filtración.
//
// Largo máximo: bcrypt solo usa los primeros 72 bytes; más allá se ignoraría sin aviso. Por eso el tope
// es de 64 caracteres y 72 bytes (una "ñ" o una tilde ocupan 2 bytes).

const LARGO_MINIMO = 15
const LARGO_MAXIMO = 64
const BYTES_MAXIMOS = 72

// Contraseñas y frases muy usadas de 15 o más caracteres (las más cortas ya las descarta el largo mínimo).
// Se comparan sin mayúsculas, sin espacios y sin símbolos.
const COMUNES = new Set([
    "123456789012345", "1234567890123456", "12345678901234567890", "098765432109876",
    "qwertyuiopasdfg", "qwertyuiopasdfgh", "qwertyuiopasdfghjkl", "asdfghjklqwerty",
    "passwordpassword", "password12345678", "password123456789", "contrasena12345", "contrasena123456",
    "contrasenasegura", "micontrasenasegura", "estaesmicontrasena", "esta es mi contrasena",
    "iloveyouiloveyou", "teamoteamoteamo", "teamomucho12345", "abcdefghijklmno",
    "administrador123", "administrador1234", "admin12345678901", "bienvenido12345", "bienvenido123456",
    "chilechilechile", "vivachile123456", "colocolo12345678", "universidaddechile", "santiagodechile",
    "1qaz2wsx3edc4rfv", "qazwsxedcrfvtgb", "zaq12wsxcde34rfv", "q1w2e3r4t5y6u7i8",
    "letmeinletmein", "trustno1trustno1", "superman12345678", "dragon1234567890",
    "remuneraciones123", "recursoshumanos", "recursoshumanos1", "recursoshumanos123"
].map(normalizar))

// Filas de teclado y secuencias: si la contraseña cabe entera dentro de una (o de su reverso), es predecible.
const SECUENCIAS = [
    "01234567890123456789012345678901234567890",
    "abcdefghijklmnñopqrstuvwxyzabcdefghijklmnñopqrstuvwxyz",
    "qwertyuiopasdfghjklñzxcvbnmqwertyuiopasdfghjklñzxcvbnm",
    "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p",
    "qazwsxedcrfvtgbyhnujmikolp"
]

const NOMBRE_SISTEMA = "gestorrh"

function normalizar(texto) {
    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9ñ]/g, "")
}

// Partes del correo y del nombre que no deben aparecer dentro de la contraseña (solo las de 4 o más letras).
function palabrasPersonales({ email, nombre } = {}) {
    const partes = []
    if (typeof email === "string") {
        const [local, dominio] = email.split("@")
        partes.push(...String(local ?? "").split(/[._\-+]/), String(dominio ?? "").split(".")[0])
    }
    if (typeof nombre === "string") {
        partes.push(...nombre.split(/\s+/))
    }
    return partes.map(normalizar).filter((parte) => parte.length >= 4)
}

function esSecuencia(normalizada) {
    const reverso = [...normalizada].reverse().join("")
    return SECUENCIAS.some((secuencia) => secuencia.includes(normalizada) || secuencia.includes(reverso))
}

// "holaholahola", "abcabcabcabc", "aaaaaaaaaaaaaaa": un mismo trozo repetido.
function esRepeticion(normalizada) {
    return /^(.{1,8})\1+$/.test(normalizada) || new Set(normalizada).size < 5
}

// Devuelve la lista de motivos por los que la contraseña no sirve (vacía si es aceptable).
function problemasDePassword(password, contexto = {}) {
    if (typeof password !== "string" || password.length === 0) {
        return ["Debe ingresar la contraseña nueva"]
    }

    const largo = [...password].length
    if (largo < LARGO_MINIMO) {
        return [`La contraseña debe tener al menos ${LARGO_MINIMO} caracteres. Una frase de tres o cuatro palabras es lo más fácil de recordar`]
    }
    if (largo > LARGO_MAXIMO || Buffer.byteLength(password, "utf8") > BYTES_MAXIMOS) {
        return [`La contraseña puede tener como máximo ${LARGO_MAXIMO} caracteres`]
    }
    if (password.trim() !== password) {
        return ["La contraseña no puede empezar ni terminar con espacios"]
    }

    const normalizada = normalizar(password)
    const problemas = []

    if (COMUNES.has(normalizada) || esSecuencia(normalizada) || esRepeticion(normalizada)) {
        problemas.push("La contraseña es demasiado común o predecible (secuencias, repeticiones o contraseñas conocidas)")
    }

    const personales = [...palabrasPersonales(contexto), NOMBRE_SISTEMA]
    if (personales.some((parte) => normalizada.includes(parte))) {
        problemas.push("La contraseña no puede contener tu correo, tu nombre ni el nombre del sistema")
    }

    return problemas
}

module.exports = { problemasDePassword, LARGO_MINIMO, LARGO_MAXIMO }
