const { autenticarUsuario, cambiarPassword } = require("./auth.service.js")


async function login(req, res) {
    const { email, password } = req.body ?? {}
    const token = await autenticarUsuario(email, password)
    res.status(200).json({ token })
}

async function cambiar(req, res) {
    const { password_actual, password_nueva } = req.body ?? {}
    await cambiarPassword(req.usuario.id, password_actual, password_nueva)

    res.status(200).json({ mensaje: "Contraseña actualizada" })
}

module.exports = {
    login,
    cambiar
}