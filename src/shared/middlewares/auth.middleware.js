const jwt = require("jsonwebtoken")
const { Usuario, UsuarioEmpresaRol, Empresa, Cuenta } = require("../associations");
const { AuthenticationError } = require("../errors");

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

            if (cuenta.estado === "cancelada") {
                throw new AuthenticationError("Cuenta cancelada")
            }
        }

        if (usuario.debe_cambiar_password === true && req.originalUrl !== "/api/auth/cambiar-password") {
            return res.status(403).json({ error: "Debes cambiar contraseña antes de continuar" })
        }

        req.usuario = usuario

        const vinculos = await UsuarioEmpresaRol.findAll({
            where: { usuario_id: usuario.id, estado: "activo" }
        })

        let empresasPermitidas = vinculos.map((vinculo) => vinculo.empresa_id)

        const soporte = usuario.rol_plataforma === "soporte"

        if (soporte === true) {
            const acceso = await Empresa.findAll({
                attributes: ["id"]
            })

            empresasPermitidas = acceso.map((empresa) => empresa.id)
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