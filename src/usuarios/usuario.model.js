const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Usuario = sequelize.define("Usuario", {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("activo", "inactivo"),
        defaultValue: "activo"
    },
    es_soporte_plataforma: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }

}, {
    tableName: "usuarios",
    defaultScope: {
        attributes: { exclude: ["password_hash"] }
    }
},
)
Usuario.prototype.toJSON = function () {
    const valores = { ...this.get() }
    delete valores.password_hash
    return valores
}

module.exports = {
    Usuario
}