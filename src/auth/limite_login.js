const { LimitadorIntentos } = require("./limitador_intentos.js")
const { TooManyRequestsError } = require("../shared/errors.js")

const QUINCE_MINUTOS = 15 * 60 * 1000

// Por cuenta (email): 5 fallos en 15 minutos bloquean 15 minutos. Protege cada cuenta aunque el atacante cambie de IP.
// Por IP: 30 fallos en 15 minutos. Más holgado a propósito: una oficina entera puede salir con la misma IP.
// El bloqueo por email vale también para emails que no existen, así no se descubre qué cuentas hay.
function crearLimiteLogin(ahora = () => Date.now()) {
    const porEmail = new LimitadorIntentos({ maxIntentos: 5, ventanaMs: QUINCE_MINUTOS, bloqueoMs: QUINCE_MINUTOS, ahora })
    const porIp = new LimitadorIntentos({ maxIntentos: 30, ventanaMs: QUINCE_MINUTOS, bloqueoMs: QUINCE_MINUTOS, ahora })

    const claveEmail = (email) => String(email ?? "").trim().toLowerCase().slice(0, 200)
    const claveIp = (ip) => String(ip ?? "desconocida")

    return {
        // Lanza 429 si la cuenta o la IP están bloqueadas.
        exigirPermitido(ip, email) {
            const falta = Math.max(porEmail.bloqueadoPorMs(claveEmail(email)), porIp.bloqueadoPorMs(claveIp(ip)))
            if (falta > 0) {
                const minutos = Math.ceil(falta / 60000)
                throw new TooManyRequestsError(`Demasiados intentos fallidos. Vuelve a intentarlo en ${minutos} minuto${minutos === 1 ? "" : "s"}.`, Math.ceil(falta / 1000))
            }
        },
        registrarFallo(ip, email) {
            porEmail.registrarFallo(claveEmail(email))
            porIp.registrarFallo(claveIp(ip))
        },
        registrarExito(email) {
            porEmail.reiniciar(claveEmail(email))
        }
    }
}

module.exports = { crearLimiteLogin, limiteLogin: crearLimiteLogin() }
