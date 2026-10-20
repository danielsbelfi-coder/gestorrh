const { autenticarUsuario, cambiarPassword } = require("./auth.service.js")


async function login(req, res) {
    const { email, password } = req.body ?? {}
    const resultado = await autenticarUsuario(email, password)
    res.status(200).json(resultado)
}

async function cambiar(req, res) {
    const { password_actual, password_nueva } = req.body ?? {}
    await cambiarPassword(req.usuario.id, password_actual, password_nueva)

    res.status(200).json({ mensaje: "Contraseña actualizada" })
}

function usuarioEnUso(req, res) {
    const { id, nombre, email, cuenta_id, es_admin_cuenta, rol_plataforma } = req.usuario

    res.status(200).json({ id, nombre, email, cuenta_id, es_admin_cuenta, rol_plataforma })
}

module.exports = {
    login,
    cambiar,
    usuarioEnUso
}