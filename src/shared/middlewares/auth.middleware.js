// Revisa la sesión de cada petición (cookie + sesión guardada en el servidor). Ver "Seguridad de acceso" en el SPEC.
const { UsuarioEmpresaRol, Cuenta, Rol } = require("../associations");
const { ROLES_ASIGNABLES } = require("../permisos");
const { rutaDePlataforma, enmascararCuentas } = require("../../soporte/acceso_soporte.js");
const { origenDeLaApp } = require("../configuracion.js")
const {
    nombreCookie, opcionesCookie, leerCookie, motivoInvalidez, estadoDeAcceso, rutaPermitida, mensajeDeEstado,
    metodoQueEscribe, origenPermitido, csrfValido
} = require("../../auth/reglas_sesion.js")
const sesiones = require("../../auth/sesion.service.js")

const PRODUCCION = process.env.NODE_ENV === "production"
const NOMBRE_COOKIE = nombreCookie(PRODUCCION)

const RUTAS_CUENTA_CANCELADA = [
    "GET /api/auth/usuario",
    "PATCH /api/auth/cambiar-password",
    "POST /api/auth/logout",
    "GET /api/cuenta/empresas"
]

function rutaPermitidaCuentaCancelada(req) {
    const ruta = req.originalUrl.split("?")[0]

    return RUTAS_CUENTA_CANCELADA.includes(`${req.method} ${ruta}`)
        || (req.method === "GET" && /^\/api\/cuenta\/empresas\/\d+\/exportar$/.test(ruta))
}

function sinSesion(res) {
    res.clearCookie(NOMBRE_COOKIE, opcionesCookie(PRODUCCION))
    return res.status(401).json({ error: "Tu sesión terminó. Inicia sesión de nuevo" })
}

// La petición debe venir de la propia aplicación (Origin) y traer el token CSRF de la sesión.
// El login no pasa por aquí: solo revisa Origin (ver auth.controller.js).
function revisarCsrf(req, sesion) {
    const origen = { origin: req.get("origin"), secFetchSite: req.get("sec-fetch-site") }
    return origenPermitido(origen, origenDeLaApp(process.env)) && csrfValido(req.get("x-csrf-token"), sesion.csrf_token)
}

const verificarSesion = async (req, res, next) => {
    try {
        const token = leerCookie(req.headers.cookie, NOMBRE_COOKIE)
        const sesion = await sesiones.buscarSesion(token)

        if (sesion === null) {
            return sinSesion(res)
        }

        const usuario = sesion.Usuario

        if (!usuario || usuario.estado !== "activo") {
            await sesiones.cerrarTodasLasSesiones(sesion.usuario_id)
            return sinSesion(res)
        }

        if (motivoInvalidez(sesion, usuario) !== null) {
            await sesiones.cerrarSesion(sesion.id)
            return sinSesion(res)
        }

        if (metodoQueEscribe(req.method) && !revisarCsrf(req, sesion)) {
            return res.status(403).json({ error: "La solicitud no es válida. Recarga la página", codigo: "csrf" })
        }

        if (usuario.cuenta_id !== null) {
            const cuenta = await Cuenta.findByPk(usuario.cuenta_id)

            req.cuentaEstado = cuenta.estado
            req.cuentaFechaCancelacion = cuenta.fecha_cancelacion

            if (cuenta.estado === "cancelada") {
                if (usuario.es_admin_cuenta !== true) {
                    await sesiones.cerrarTodasLasSesiones(usuario.id)
                    return sinSesion(res)
                }

                if (!rutaPermitidaCuentaCancelada(req)) {
                    return res.status(403).json({ error: "La cuenta está cancelada: solo puedes exportar tus datos" })
                }
            }
        }

        // Pasos obligatorios pendientes (código del 2FA, cambiar la contraseña, inscribir el 2FA).
        let estado = estadoDeAcceso(sesion, usuario)
        // TEMPORAL hasta S4: todavía no existen las pantallas para inscribir el 2FA, así que no se exige.
        if (estado === "activar_2fa") {
            estado = "normal"
        }
        if (!rutaPermitida(estado, req.method, req.originalUrl)) {
            return res.status(403).json({ error: mensajeDeEstado(estado), paso: estado })
        }

        await sesiones.tocarSesion(sesion)

        req.usuario = usuario
        req.sesion = sesion

        // Solo los roles en uso dan acceso: un vínculo antiguo como SUPERVISOR o LECTURA no abre la empresa.
        const vinculos = await UsuarioEmpresaRol.findAll({
            where: { usuario_id: usuario.id, estado: "activo" },
            include: [{ model: Rol, attributes: ["codigo"], where: { codigo: ROLES_ASIGNABLES }, required: true }]
        })

        let empresasPermitidas = vinculos.map((vinculo) => vinculo.empresa_id)

        const soporte = usuario.rol_plataforma === "soporte"

        if (soporte === true) {
            // Soporte solo ve las empresas que un administrador del cliente autorizó y que siguen vigentes.
            const servicio = require("../../soporte/acceso_soporte.service.js")
            const accesos = await servicio.accesosVigentes()

            req.accesosSoporte = accesos
            empresasPermitidas = [...new Set(accesos.map((acceso) => acceso.empresa_id))]

            // El número de cuenta bancaria nunca se muestra completo a soporte.
            const jsonOriginal = res.json.bind(res)
            res.json = (cuerpo) => jsonOriginal(enmascararCuentas(cuerpo))

            // Todo lo que soporte pide fuera de las rutas de la plataforma queda registrado (aunque termine en error).
            if (!rutaDePlataforma(req.originalUrl)) {
                const datos = { usuario, accesos, metodo: req.method, ruta: req.originalUrl, ip: req.ip }
                // "close" ocurre siempre (también si el navegador corta la conexión antes de recibir la respuesta).
                res.once("close", () => {
                    servicio.registrarConsulta({ ...datos, estadoHttp: res.statusCode })
                        .catch((error) => console.error("No se pudo registrar la consulta de soporte:", error.message))
                })
            }
        }

        req.empresasPermitidas = empresasPermitidas

        next()

    } catch (error) {
        console.error("Error al revisar la sesión:", error.message)
        res.status(500).json({
            error: "Error interno del servidor"
        })
    }
}

module.exports = verificarSesion
module.exports.NOMBRE_COOKIE = NOMBRE_COOKIE
module.exports.PRODUCCION = PRODUCCION
