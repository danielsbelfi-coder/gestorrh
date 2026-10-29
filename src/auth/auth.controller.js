const { DIAS_CONSERVACION_DATOS } = require("../shared/constantes.js")
const { sumarDias } = require("../shared/fechas.js")
const { autenticarUsuario, cambiarPassword } = require("./auth.service.js")
const { limiteLogin } = require("./limite_login.js")
const { AuthenticationError } = require("../shared/errors.js")
const sesiones = require("./sesion.service.js")
const { origenDeLaApp } = require("../shared/configuracion.js")
const { opcionesCookie, leerCookie, origenPermitido, requiere2fa } = require("./reglas_sesion.js")
const { NOMBRE_COOKIE, PRODUCCION } = require("../shared/middlewares/auth.middleware.js")

function fijarCookie(res, token) {
    res.cookie(NOMBRE_COOKIE, token, opcionesCookie(PRODUCCION))
}

function datosDeLaPeticion(req) {
    return { ip: req.ip, navegador: req.get("user-agent") }
}

async function login(req, res) {
    // Contra el "CSRF de login": un sitio ajeno no puede iniciar sesión en nombre del navegador.
    if (!origenPermitido({ origin: req.get("origin"), secFetchSite: req.get("sec-fetch-site") }, origenDeLaApp(process.env))) {
        return res.status(403).json({ error: "La solicitud no es válida. Recarga la página", codigo: "csrf" })
    }

    const { email, password } = req.body ?? {}

    limiteLogin.exigirPermitido(req.ip, email)

    let resultado
    try {
        resultado = await autenticarUsuario(email, password)
    } catch (error) {
        if (error instanceof AuthenticationError) {
            limiteLogin.registrarFallo(req.ip, email)
        }
        throw error
    }

    limiteLogin.registrarExito(email)

    // Si el navegador ya tenía una sesión, se cierra: no quedan sesiones huérfanas.
    await sesiones.buscarYCerrarPorToken(leerCookie(req.headers.cookie, NOMBRE_COOKIE))

    const { token, csrfToken } = await sesiones.crearSesion(resultado.usuario, { estado: "activa", ...datosDeLaPeticion(req) })
    fijarCookie(res, token)

    res.status(200).json({
        paso: "listo",
        debeCambiarPassword: resultado.debeCambiarPassword,
        cuentaCancelada: resultado.cuentaCancelada,
        csrfToken
    })
}

async function logout(req, res) {
    await sesiones.cerrarSesion(req.sesion.id)
    res.clearCookie(NOMBRE_COOKIE, opcionesCookie(PRODUCCION))
    res.status(204).end()
}

// Cambiar la contraseña cierra las demás sesiones y renueva la actual (cookie y token CSRF nuevos).
async function cambiar(req, res) {
    const { password_actual, password_nueva } = req.body ?? {}
    await cambiarPassword(req.usuario.id, password_actual, password_nueva)

    await sesiones.cerrarOtrasSesiones(req.usuario.id, req.sesion.id)
    const { token, csrfToken } = await sesiones.rotarSesion(req.sesion)
    fijarCookie(res, token)

    res.status(200).json({ mensaje: "Contraseña actualizada", csrfToken })
}

async function listarMisSesiones(req, res) {
    res.status(200).json(await sesiones.listarSesiones(req.usuario.id, req.sesion.id))
}

async function cerrarMisOtrasSesiones(req, res) {
    const cerradas = await sesiones.cerrarOtrasSesiones(req.usuario.id, req.sesion.id)
    res.status(200).json({ cerradas })
}

function usuarioEnUso(req, res) {
    const { id, nombre, email, cuenta_id, es_admin_cuenta, rol_plataforma, totp_activo, debe_cambiar_password } = req.usuario

    const cuentaFechaEliminacion = req.cuentaFechaCancelacion
        ? sumarDias(req.cuentaFechaCancelacion, DIAS_CONSERVACION_DATOS)
        : null

    const respuesta = {
        id, nombre, email, cuenta_id, es_admin_cuenta, rol_plataforma,
        cuenta_estado: req.cuentaEstado ?? null,
        cuenta_fecha_eliminacion: cuentaFechaEliminacion,
        debe_cambiar_password: debe_cambiar_password === true,
        totp_activo: totp_activo === true,
        requiere_2fa: requiere2fa(req.usuario),
        // El navegador lo envía en la cabecera X-CSRF-Token en cada petición que escribe.
        csrf_token: req.sesion.csrf_token
    }

    // Para el aviso de la barra superior: qué empresas puede consultar soporte ahora y hasta cuándo.
    if (rol_plataforma === "soporte") {
        respuesta.accesos_soporte = (req.accesosSoporte ?? []).map((acceso) => ({
            empresa_id: acceso.empresa_id,
            razon_social: acceso.Empresa.razon_social,
            hasta: acceso.hasta
        }))
    }

    res.status(200).json(respuesta)
}

module.exports = {
    login,
    logout,
    cambiar,
    listarMisSesiones,
    cerrarMisOtrasSesiones,
    usuarioEnUso
}
