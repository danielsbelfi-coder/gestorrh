require("dotenv").config()
const Sequelize = require("sequelize")

// En la nube la base de datos administrada casi siempre exige conexión cifrada: DB_SSL=true la activa.
const opcionesSsl = process.env.DB_SSL === "true"
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: process.env.DB_DIALECT,
        dialectOptions: opcionesSsl,
        logging: false
    }

)

async function testConnection() {
    try {
        await sequelize.authenticate()

        console.log("autencificacion correcta")
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    sequelize,
    testConnection
}
