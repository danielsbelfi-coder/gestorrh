const DIAS_CONSERVACION_DATOS = 90

// El registro de lo que consulta soporte se guarda 2 años (para que el cliente pueda ver quién accedió a sus datos).
const DIAS_CONSERVACION_REGISTRO_SOPORTE = 730

// Sesiones: duración máxima y cierre por inactividad (más corto para los usuarios de la plataforma).
const SESION_MAX_HORAS = 8
const INACTIVIDAD_CLIENTE_MIN = 60
const INACTIVIDAD_PLATAFORMA_MIN = 30
// Tiempo para escribir el código del 2FA después de ingresar la contraseña.
const PENDIENTE_2FA_MIN = 5

// Intentos fallidos del código del 2FA (los de la contraseña ya los controla limite_login.js con los mismos valores).
const INTENTOS_MAXIMOS = 5
const VENTANA_INTENTOS_MIN = 15
const BLOQUEO_MIN = 15

const CODIGOS_RECUPERACION = 10

module.exports = {
    DIAS_CONSERVACION_DATOS,
    DIAS_CONSERVACION_REGISTRO_SOPORTE,
    SESION_MAX_HORAS,
    INACTIVIDAD_CLIENTE_MIN,
    INACTIVIDAD_PLATAFORMA_MIN,
    PENDIENTE_2FA_MIN,
    INTENTOS_MAXIMOS,
    VENTANA_INTENTOS_MIN,
    BLOQUEO_MIN,
    CODIGOS_RECUPERACION
}
