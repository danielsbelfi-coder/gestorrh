require("dotenv").config();

// La configuración se revisa ANTES de cargar la aplicación: si algo grave falta, el servidor no parte.
const { validarConfiguracion } = require("./src/shared/configuracion.js")
const { errores, advertencias } = validarConfiguracion(process.env)

for (const aviso of advertencias) {
    console.warn(`AVISO: ${aviso}`)
}
if (errores.length > 0) {
    console.error("El servidor no puede iniciar por problemas de configuración:")
    for (const error of errores) {
        console.error(` - ${error}`)
    }
    process.exit(1)
}

const { app } = require("./src/app.js")

const PORT = process.env.PORT || 3000;

const iniciarServidor = () => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`)
    })
}

iniciarServidor()
