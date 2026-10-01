require("dotenv").config()
const { crearUsuario } = require("../src/usuarios/usuario.service.js")

async function crearAdmin() {
    if (
        !process.env.ADMIN_NOMBRE ||
        !process.env.ADMIN_EMAIL ||
        !process.env.ADMIN_PASSWORD
    ) {
        console.error(
            "Faltan variables de entorno: ADMIN_NOMBRE, ADMIN_EMAIL, ADMIN_PASSWORD"
        );
        process.exit(1);
    }

    try {
        const admin = await crearUsuario({
            nombre: process.env.ADMIN_NOMBRE,
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            estado: "activo"
        })
        console.log("administrador creado:", admin.email)
        
        process.exit(0)

    } catch (error) {
        console.error("Error al crear el administrador:", error.message)
        process.exit(1)
    }

}

crearAdmin()