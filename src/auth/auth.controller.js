const { DIAS_CONSERVACION_DATOS } = require("../shared/constantes.js")
const { sumarDias } = require("../shared/fechas.js")
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

    const cuentaFechaEliminacion = req.cuentaFechaCancelacion
        ? sumarDias(req.cuentaFechaCancelacion, DIAS_CONSERVACION_DATOS)
        : null

    res.status(200).json({ id, nombre, email, cuenta_id, es_admin_cuenta, rol_plataforma, cuenta_estado: req.cuentaEstado ?? null, cuenta_fecha_eliminacion: cuentaFechaEliminacion })
}

module.exports = {
    login,
    cambiar,
    usuarioEnUso
}