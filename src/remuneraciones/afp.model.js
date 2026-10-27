const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Afp = sequelize.define("Afp", {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    estado: {
        type: DataTypes.ENUM("activo", "inactivo"),
        allowNull: false,
        defaultValue: "activo"
    },
    comision: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    codigo_previred: {
        type: DataTypes.STRING(2),
        allowNull: true
    },
    codigo_lre: {
        type: DataTypes.SMALLINT,
        allowNull: true
    }
}, {
    tableName: "afps"
})

module.exports = {
    Afp
}