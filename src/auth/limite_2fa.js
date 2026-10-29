const { LimitadorIntentos } = require("./limitador_intentos.js")
const { TooManyRequestsError } = require("../shared/errors.js")
const { INTENTOS_MAXIMOS, VENTANA_INTENTOS_MIN, BLOQUEO_MIN } = require("../shared/constantes.js")

const MINUTO = 60 * 1000

// Intentos fallidos del código de verificación, por usuario: 5 fallos en 15 minutos bloquean 15 minutos.
// Mismo limitador en memoria que el login (ver limitador_intentos.js y sus límites).
// Sin esto, un código de 6 dígitos se podría adivinar probando muchas veces.
function crearLimite2fa(ahora = () => Date.now()) {
    const porUsuario = new LimitadorIntentos({
        maxIntentos: INTENTOS_MAXIMOS,
        ventanaMs: VENTANA_INTENTOS_MIN * MINUTO,
        bloqueoMs: BLOQUEO_MIN * MINUTO,
        ahora
    })

    const clave = (usuarioId) => `2fa:${usuarioId}`

    return {
        // Lanza 429 si el usuario está bloqueado.
        exigirPermitido(usuarioId) {
            const falta = porUsuario.bloqueadoPorMs(clave(usuarioId))
            if (falta > 0) {
                const minutos = Math.ceil(falta / MINUTO)
                throw new TooManyRequestsError(`Demasiados códigos incorrectos. Vuelve a intentarlo en ${minutos} minuto${minutos === 1 ? "" : "s"}.`, Math.ceil(falta / 1000))
            }
        },
        // Devuelve true si con este fallo el usuario quedó bloqueado (para borrar la sesión pendiente).
        registrarFallo(usuarioId) {
            porUsuario.registrarFallo(clave(usuarioId))
            return porUsuario.bloqueadoPorMs(clave(usuarioId)) > 0
        },
        registrarExito(usuarioId) {
            porUsuario.reiniciar(clave(usuarioId))
        }
    }
}

module.exports = { crearLimite2fa, limite2fa: crearLimite2fa() }
