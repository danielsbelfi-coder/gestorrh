const { AuthenticationError } = require("../shared/errors.js")
const { autenticarUsuario } = require("./auth.service.js")


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

module.exports = {
    login
}