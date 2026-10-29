// Restablece el acceso de un usuario desde el servidor (soporte técnico): contraseña inicial nueva,
// verificación en dos pasos desactivada y todas sus sesiones cerradas. Sirve para cualquier usuario,
// incluidos soporte y comercial (que no tienen a nadie arriba que se lo restablezca desde la app).
//   node scripts/reiniciar-acceso.js correo@dominio.cl
// La contraseña inicial se muestra UNA sola vez; al ingresar se pide cambiarla y, si el perfil lo requiere,
// inscribir de nuevo la app de autenticación.
require("dotenv").config()
const { sequelize } = require("../src/shared/database.js")
const { restablecerAcceso } = require("../src/auth/restablecer_acceso.js")

async function main() {
    const email = (process.argv[2] ?? "").trim()
    if (!email.includes("@")) {
        console.error("Uso: node scripts/reiniciar-acceso.js <correo>")
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

    const password = await restablecerAcceso(usuarios[0].id, { activar: true })

    console.log(`Acceso restablecido para ${usuarios[0].email} (id ${usuarios[0].id}): sesiones cerradas y verificación en dos pasos desactivada.`)
    console.log(`Contraseña inicial: ${password}`)
    console.log("Cópiala ahora: no se vuelve a mostrar. Se pedirá cambiarla al ingresar.")
}

main()
    .then(() => sequelize.close())
    .catch(async (error) => {
        console.error("No se pudo restablecer el acceso:", error.message)
        await sequelize.close()
        process.exit(1)
    })
