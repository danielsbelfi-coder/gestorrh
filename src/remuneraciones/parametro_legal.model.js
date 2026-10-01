const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const ParametroLegal = sequelize.define("ParametroLegal", {
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    valor: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM(
            "porcentaje",
            "monto",
            "factor",
            "otro"
        ),
        allowNull: false
    },
    vigencia_desde: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    vigencia_hasta: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fuente: {
        type: DataTypes.STRING,
        allowNull: true
    },
}, {
    tableName: "parametros_legales"
}
)

module.exports = {
    ParametroLegal
}