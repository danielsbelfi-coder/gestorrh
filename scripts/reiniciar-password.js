// Reinicia la contraseña de un usuario (por ejemplo, si el administrador la perdió o quedó bloqueado).
//   node scripts/reiniciar-password.js correo@dominio.cl
// Genera una contraseña inicial al azar, se muestra UNA sola vez y el sistema obliga a cambiarla al ingresar.
require("dotenv").config()
const { sequelize } = require("../src/shared/database.js")
const { Usuario } = require("../src/shared/associations.js")
const { generarPasswordInicial } = require("../src/shared/password.js")

async function main() {
    const email = (process.argv[2] ?? "").trim()
    if (!email.includes("@")) {
        console.error("Uso: node scripts/reiniciar-password.js <correo>")
        process.exit(1)
    }

    // Se busca ignorando mayúsculas y espacios, porque el correo puede haberse guardado tal como se tipeó.
    const [usuarios] = await sequelize.query(
        "SELECT id, email FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(:email)",
        { replacements: { email } }
    )
    if (usuarios.length === 0) {
        console.error(`No existe un usuario con el correo ${email}.`)
        process.exit(1)
    }

    const { password, hash } = await generarPasswordInicial()
    await Usuario.update(
        { password_hash: hash, debe_cambiar_password: true, estado: "activo", password_cambiado_en: new Date() },
        { where: { id: usuarios[0].id } }
    )

    console.log(`Contraseña reiniciada para ${usuarios[0].email} (id ${usuarios[0].id}).`)
    console.log(`Contraseña inicial: ${password}`)
    console.log("Cópiala ahora: no se vuelve a mostrar. Se pedirá cambiarla al ingresar.")
}

main()
    .then(() => sequelize.close())
    .catch(async (error) => {
        console.error("No se pudo reiniciar la contraseña:", error.message)
        await sequelize.close()
        process.exit(1)
    })
