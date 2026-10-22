const { autenticarUsuario, cambiarPassword } = require("./auth.service.js")


async function login(req, res) {
    const { email, password } = req.body ?? {}
    const resultado = await autenticarUsuario(email, password)
    res.status(200).json(resultado)
}

async function cambiar(req, res) {
    const { password_actual, password_nueva } = req.body ?? {}
    const token = await cambiarPassword(req.usuario.id, password_actual, password_nueva)

    res.status(200).json({ mensaje: "Contraseña actualizada", token })
}

function usuarioEnUso(req, res) {
    const { id, nombre, email, cuenta_id, es_admin_cuenta, rol_plataforma } = req.usuario

    res.status(200).json({ id, nombre, email, cuenta_id, es_admin_cuenta, rol_plataforma, cuenta_estado: req.cuentaEstado ?? null })
}

module.exports = {
    login,
    cambiar,
    usuarioEnUso
}