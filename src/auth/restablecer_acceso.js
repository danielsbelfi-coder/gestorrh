// Restablecer el acceso de un usuario: contraseña inicial nueva, verificación en dos pasos desactivada
// y todas sus sesiones cerradas, siempre juntos y en una sola transacción.
// Si solo se cambiara la contraseña, quien la conocía no podría entrar, pero quien tuviera el celular sí podría
// seguir; y si solo se quitara el 2FA, quien conociera la contraseña podría inscribir su propio celular.
const { sequelize } = require("../shared/database.js")
const { Usuario } = require("../shared/associations.js")
const { generarPasswordInicial } = require("../shared/password.js")
const { borrarDosPasos } = require("./dos_pasos.service.js")
const { cerrarTodasLasSesiones } = require("./sesion.service.js")

// Devuelve la contraseña inicial (es la única vez que existe en texto: en la base queda su hash).
// Con { activar: true } además deja el usuario activo (lo usa el script de soporte técnico).
async function restablecerAcceso(usuarioId, { activar = false } = {}) {
    const { password, hash } = await generarPasswordInicial()

    await sequelize.transaction(async (transaction) => {
        const cambios = { password_hash: hash, debe_cambiar_password: true, password_cambiado_en: new Date() }
        if (activar) {
            cambios.estado = "activo"
        }
        await Usuario.update(cambios, { where: { id: usuarioId }, transaction })
        await borrarDosPasos(usuarioId, { transaction })
        await cerrarTodasLasSesiones(usuarioId, { transaction })
    })

    return password
}

module.exports = { restablecerAcceso }
