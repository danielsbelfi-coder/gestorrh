const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Feriados legales de Chile. Son globales (los mismos para todas las cuentas); solo soporte los modifica.
// nacional: sin región ni comuna. regional: región (1 a 16). comunal: código de comuna de la DT.
const Feriado = sequelize.define("Feriado", {
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    alcance: {
        type: DataTypes.ENUM("nacional", "regional", "comunal"),
        allowNull: false
    },
    region: {
        type: DataTypes.SMALLINT,
        allowNull: true
    },
    comuna: {
        type: DataTypes.STRING(5),
        allowNull: true
    },
    irrenunciable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: "feriados"
})

module.exports = { Feriado }
