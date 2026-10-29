const jwt = require("jsonwebtoken")
const { Usuario, UsuarioEmpresaRol, Empresa, Cuenta, Rol } = require("../associations");
const { ROLES_ASIGNABLES } = require("../permisos");
const { AuthenticationError } = require("../errors");
const { rutaDePlataforma, enmascararCuentas } = require("../../soporte/acceso_soporte.js");

const RUTAS_CUENTA_CANCELADA = [
    "GET /api/auth/usuario",
    "PATCH /api/auth/cambiar-password",
    "GET /api/cuenta/empresas"
]

function rutaPermitidaCuentaCancelada(req) {
    const ruta = req.originalUrl.split("?")[0]

    return RUTAS_CUENTA_CANCELADA.includes(`${req.method} ${ruta}`)
        || (req.method === "GET" && /^\/api\/cuenta\/empresas\/\d+\/exportar$/.test(ruta))
}

const verificarToken = async (req, res, next) => {
    try {

        const auth = req.headers.authorization;


        if (!auth) {
            throw new AuthenticationError('Token no proporcionado')
        };

        const token = auth.split(" ")[1]

        if (!token) {
            throw new AuthenticationError('Token no proporcionado')
        }

        const tokenPayload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] })

        const usuario = await Usuario.findByPk(tokenPayload.sub)

        if (usuario === null || usuario.estado !== "activo") {
            throw new AuthenticationError("Usuario no válido")
        }

        if (usuario.cuenta_id !== null) {
            const cuenta = await Cuenta.findByPk(usuario.cuenta_id)

            req.cuentaEstado = cuenta.estado
            req.cuentaFechaCancelacion = cuenta.fecha_cancelacion

            if (cuenta.estado === "cancelada") {
                if (usuario.es_admin_cuenta !== true) {
                    throw new AuthenticationError("Cuenta cancelada")
                }

                if (!rutaPermitidaCuentaCancelada(req)) {
                    return res.status(403).json({ error: "La cuenta está cancelada: solo puedes exportar tus datos" })
                }
            }
        }

        if (usuario.password_cambiado_en !== null) {
            const cambioEnSegundos = Math.floor(usuario.password_cambiado_en.getTime() / 1000)

            if (tokenPayload.iat < cambioEnSegundos) {
                throw new AuthenticationError("Token anterior al último cambio de contraseña")
            }
        }

        if (usuario.debe_cambiar_password === true && req.originalUrl !== "/api/auth/cambiar-password") {
            return res.status(403).json({ error: "Debes cambiar contraseña antes de continuar" })
        }

        req.usuario = usuario

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
        if (error instanceof AuthenticationError)
            return res.status(error.statusCode).json({ error: "Acceso denegado. Token no proporcionado o inválido." })

        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError")
            return res.status(401).json({ error: "Acceso denegado. Token no proporcionado o inválido." })
        res.status(500).json({
            error: "Error interno del servidor"
        })
    }
}

module.exports = verificarToken