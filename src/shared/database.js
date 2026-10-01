require("dotenv").config()
const Sequelize = require("sequelize")

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT
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