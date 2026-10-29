require("dotenv").config()
const { opcionesSslBaseDatos } = require("../src/shared/ssl_base_datos.js")

// Las migraciones y seeders (sequelize-cli) usan la misma configuración que el servidor, en cualquier entorno.
// Así no importa si NODE_ENV es development o production: siempre se leen las variables DB_*.
const desdeEntorno = () => ({
    "username": process.env.DB_USER,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_NAME,
    "host": process.env.DB_HOST,
    "port": process.env.DB_PORT || 5432,
    "dialect": process.env.DB_DIALECT,
    "dialectOptions": opcionesSslBaseDatos(process.env)
})

const config = {
    "development": desdeEntorno(),
    "test": desdeEntorno(),
    "production": desdeEntorno()
}

module.exports = config
