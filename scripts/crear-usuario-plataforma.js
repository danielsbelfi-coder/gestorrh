// Crea un usuario de la plataforma (no de una empresa cliente): soporte o comercial.
//   node scripts/crear-usuario-plataforma.js soporte correo@dominio.cl "Nombre Apellido"
// Genera una contraseña inicial al azar, se muestra UNA sola vez y el sistema obliga a cambiarla al primer ingreso.
require("dotenv").config()
const { sequelize } = require("../src/shared/database.js")
const { Usuario } = require("../src/shared/associations.js")
const { generarPasswordInicial } = require("../src/shared/password.js")

const ROLES = ["soporte", "comercial"]

async function main() {
    const [rol, email, nombre] = process.argv.slice(2)

    if (!ROLES.includes(rol) || !email || !nombre || !email.includes("@")) {
        console.error('Uso: node scripts/crear-usuario-plataforma.js <soporte|comercial> <correo> "<Nombre>"')
        process.exit(1)
    }

    const correo = email.trim().toLowerCase()
    const existente = await Usuario.unscoped().findOne({ where: { email: correo } })
    if (existente) {
        console.error(`Ya existe un usuario con el correo ${correo}.`)
        process.exit(1)
    }

    const { password, hash } = await generarPasswordInicial()
    const usuario = await Usuario.create({
        nombre: nombre.trim(),
        email: correo,
        password_hash: hash,
        estado: "activo",
        rol_plataforma: rol,
        debe_cambiar_password: true
    })

    console.log(`Usuario ${rol} creado (id ${usuario.id}).`)
    console.log(`Correo: ${correo}`)
    console.log(`Contraseña inicial: ${password}`)
    console.log("Guárdala ahora: no se vuelve a mostrar. Se pedirá cambiarla al primer ingreso.")
}

main()
    .then(() => sequelize.close())
    .catch(async (error) => {
        console.error("No se pudo crear el usuario:", error.message)
        await sequelize.close()
        process.exit(1)
    })
