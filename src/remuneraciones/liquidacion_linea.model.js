const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const LiquidacionLinea = sequelize.define("LiquidacionLinea", {
    liquidacion_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    concepto_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM("haber", "descuento", "aporte_empleador"),
        allowNull: false
    },
    imponible: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    tributable: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    base_gratificacion: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    monto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    orden: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: "liquidacion_lineas",
    name: {
        singular: "LiquidacionLinea",
        plural: "LiquidacionLineas"
    }
})

module.exports = {
    LiquidacionLinea
}