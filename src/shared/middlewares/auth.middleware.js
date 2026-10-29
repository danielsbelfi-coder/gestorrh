// Revisa la sesión de cada petición (cookie + sesión guardada en el servidor). Ver "Seguridad de acceso" en el SPEC.
const { UsuarioEmpresaRol, Cuenta, Rol } = require("../associations");
const { ROLES_ASIGNABLES } = require("../permisos");
const { rutaDePlataforma, enmascararCuentas, resolverEmpresaSoporte } = require("../../soporte/acceso_soporte.js");
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
    "POST /api/auth/2fa/verificar",
    "POST /api/auth/2fa/inscripcion/iniciar",
    "POST /api/auth/2fa/inscripcion/confirmar",
    "GET /api/auth/2fa",
    "POST /api/auth/2fa/codigos",
    "POST /api/auth/2fa/desactivar",
    "GET /api/auth/sesiones",
    "POST /api/auth/sesiones/cerrar-otras",
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
        const estado = estadoDeAcceso(sesion, usuario)
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
            // Soporte solo ve empresas que un administrador del cliente autorizó y que siguen vigentes,
            // y de a una: la que eligió en la barra (cabecera X-Empresa). Sin cabecera no ve ninguna.
            const servicio = require("../../soporte/acceso_soporte.service.js")
            const accesos = await servicio.accesosVigentes()

            // Para la barra superior: todas las empresas que podría elegir.
            req.accesosSoporte = accesos
            empresasPermitidas = []

            // El número de cuenta bancaria nunca se muestra completo a soporte.
            const jsonOriginal = res.json.bind(res)
            res.json = (cuerpo) => jsonOriginal(enmascararCuentas(cuerpo))

            // Las rutas de la plataforma (parámetros, feriados, su propia sesión...) no usan empresas ni se registran.
            if (!rutaDePlataforma(req.originalUrl)) {
                const { permitido, acceso, detalle, empresaIntentada } = resolverEmpresaSoporte(req.get("x-empresa"), accesos)

                // Todo lo que soporte pide queda registrado, una fila por petición (aunque termine en error).
                // "close" ocurre siempre (también si el navegador corta la conexión antes de recibir la respuesta).
                const datos = { usuario, acceso, detalle, empresaIntentada, metodo: req.method, ruta: req.originalUrl, ip: req.ip }
                res.once("close", () => {
                    servicio.registrarConsulta({ ...datos, estadoHttp: res.statusCode })
                        .catch((error) => console.error("No se pudo registrar la consulta de soporte:", error.message))
                })

                if (!permitido) {
                    return res.status(403).json({ error: "No tienes un acceso autorizado vigente a esa empresa", codigo: "acceso_soporte" })
                }
                if (acceso !== null) {
                    empresasPermitidas = [acceso.empresa_id]
                    req.accesoSoporte = acceso
                }
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
