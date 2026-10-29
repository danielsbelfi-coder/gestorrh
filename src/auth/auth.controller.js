const { DIAS_CONSERVACION_DATOS } = require("../shared/constantes.js")
const { sumarDias } = require("../shared/fechas.js")
const { autenticarUsuario, cambiarPassword } = require("./auth.service.js")
const { limiteLogin } = require("./limite_login.js")
const { AuthenticationError, ConflictError } = require("../shared/errors.js")
const sesiones = require("./sesion.service.js")
const dosPasos = require("./dos_pasos.service.js")
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

    // Con 2FA activo, la sesión nace "pendiente": solo sirve para escribir el código (5 minutos).
    if (resultado.usuario.totp_activo === true) {
        const pendiente = await sesiones.crearSesion(resultado.usuario, { estado: "pendiente_2fa", ...datosDeLaPeticion(req) })
        fijarCookie(res, pendiente.token)
        return res.status(200).json({ paso: "2fa", csrfToken: pendiente.csrfToken })
    }

    const { token, csrfToken } = await sesiones.crearSesion(resultado.usuario, { estado: "activa", ...datosDeLaPeticion(req) })
    fijarCookie(res, token)

    res.status(200).json({
        paso: "listo",
        debeCambiarPassword: resultado.debeCambiarPassword,
        cuentaCancelada: resultado.cuentaCancelada,
        csrfToken
    })
}

// Segundo paso del ingreso: código de la app o de recuperación. Si sirve, la sesión pendiente se cambia por una
// completa con un identificador nuevo (el de la sesión pendiente deja de servir).
async function verificarSegundoPaso(req, res) {
    if (req.sesion.estado !== "pendiente_2fa") {
        throw new ConflictError("La sesión ya está verificada")
    }

    let resultado
    try {
        resultado = await dosPasos.consumirCodigo(req.usuario, req.body?.codigo)
    } catch (error) {
        if (error.bloqueado === true) {
            await sesiones.cerrarSesion(req.sesion.id)
            res.clearCookie(NOMBRE_COOKIE, opcionesCookie(PRODUCCION))
            return res.status(429).json({ error: error.message })
        }
        throw error
    }

    await sesiones.cerrarSesion(req.sesion.id)
    const { token, csrfToken } = await sesiones.crearSesion(req.usuario, { estado: "activa", ...datosDeLaPeticion(req) })
    fijarCookie(res, token)

    res.status(200).json({
        paso: "listo",
        debeCambiarPassword: req.usuario.debe_cambiar_password === true,
        cuentaCancelada: req.cuentaEstado === "cancelada",
        csrfToken,
        tipoCodigo: resultado.tipo,
        codigosRestantes: resultado.codigosRestantes
    })
}

async function estadoDosPasos(req, res) {
    res.status(200).json(await dosPasos.estado(req.usuario.id))
}

async function iniciarInscripcion(req, res) {
    res.status(200).json(await dosPasos.iniciarInscripcion(req.usuario.id))
}

// Al activar el 2FA se cierran las demás sesiones: las abiertas antes no pasaron por el segundo paso.
async function confirmarInscripcion(req, res) {
    const codigos = await dosPasos.confirmarInscripcion(req.usuario.id, req.body?.codigo)
    await sesiones.cerrarOtrasSesiones(req.usuario.id, req.sesion.id)
    res.status(200).json({ codigos })
}

async function regenerarCodigos(req, res) {
    res.status(200).json({ codigos: await dosPasos.regenerarCodigos(req.usuario, req.body?.codigo) })
}

async function desactivarDosPasos(req, res) {
    const { password, codigo } = req.body ?? {}
    await dosPasos.desactivar(req.usuario.id, password, codigo)
    res.status(200).json({ mensaje: "Verificación en dos pasos desactivada", requiere_2fa: requiere2fa(req.usuario) })
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
    verificarSegundoPaso,
    estadoDosPasos,
    iniciarInscripcion,
    confirmarInscripcion,
    regenerarCodigos,
    desactivarDosPasos,
    login,
    logout,
    cambiar,
    listarMisSesiones,
    cerrarMisOtrasSesiones,
    usuarioEnUso
}
