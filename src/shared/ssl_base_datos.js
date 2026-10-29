// Opciones de conexión cifrada (SSL/TLS) a PostgreSQL. Las usan el servidor y sequelize-cli.
//
// Con DB_SSL=true la conexión va cifrada Y se comprueba el certificado del servidor: que lo firme una
// autoridad confiable y que corresponda al host (DB_HOST). Sin esa comprobación, alguien en medio podría
// hacerse pasar por la base de datos y leer todo, aunque la conexión vaya cifrada.
//
// - Proveedores con certificado de una autoridad pública (Neon, por ejemplo): no hay que configurar nada más;
//   Node trae la lista de autoridades confiables.
// - Proveedores con autoridad propia (por ejemplo AWS RDS): DB_SSL_CA con la ruta del archivo .pem del
//   proveedor, o con el contenido del certificado (empieza con -----BEGIN CERTIFICATE-----).
// - DB_SSL_VERIFICAR=false desactiva la comprobación. Solo para pruebas locales: en producción el servidor no arranca.
const fs = require("fs")

function leerCertificado(valor, leerArchivo) {
    const texto = String(valor).trim()
    if (texto.startsWith("-----BEGIN")) {
        // Pegado en una variable de entorno de una sola línea, los saltos suelen venir como "\n".
        return texto.replace(/\\n/g, "\n")
    }
    return leerArchivo(texto, "utf8")
}

function opcionesSslBaseDatos(env = process.env, leerArchivo = fs.readFileSync) {
    if (env.DB_SSL !== "true") {
        return {}
    }

    const ssl = { rejectUnauthorized: env.DB_SSL_VERIFICAR !== "false" }

    // El certificado se compara contra este nombre. node-postgres solo lo indica cuando DB_HOST es un nombre;
    // si es una IP, sin esto Node compararía contra "localhost".
    if (env.DB_HOST && String(env.DB_HOST).trim() !== "") {
        ssl.host = String(env.DB_HOST).trim()
    }

    if (env.DB_SSL_CA && String(env.DB_SSL_CA).trim() !== "") {
        ssl.ca = leerCertificado(env.DB_SSL_CA, leerArchivo)
    }

    return { ssl }
}

module.exports = { opcionesSslBaseDatos }
