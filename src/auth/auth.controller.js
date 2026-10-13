const { AuthenticationError, ValidationError } = require("../shared/errors.js")
const { autenticarUsuario, cambiarPassword } = require("./auth.service.js")


async function login(req, res) {
    const { email, password } = req.body ?? {}
    try {
        const token = await autenticarUsuario(email, password)

        res.status(200).json({ token })

    } catch (error) {
        if (error instanceof AuthenticationError)
            return res.status(error.statusCode).json({ error: error.message })
        res.status(500).json({ error: "Error interno del servidor" })
    }
}

async function cambiar(req, res) {
    const { password_actual, password_nueva } = req.body ?? {}
    try {
        await cambiarPassword(req.usuario.id, password_actual, password_nueva)

        res.status(200).json({ mensaje: "Contraseña actualizada" })

    } catch (error) {
        if (error instanceof ValidationError)
            return res.status(error.statusCode).json({ error: error.message })
        res.status(500).json({ error: "Error interno del servidor" })
    }
}

module.exports = {
    login,
    cambiar
}