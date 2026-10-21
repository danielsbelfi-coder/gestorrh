const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Cuenta = sequelize.define("Cuenta", {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rut_titular: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dv_titular: {
        type: DataTypes.STRING(1),
        allowNull: false
    },
    razon_social_titular: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email_contacto: {
        type: DataTypes.STRING,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM(
            "activa",
            "suspendida",
            "cancelada"
        ),
        allowNull: false,
        defaultValue: "activa"
    },
    fecha_cancelacion: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    usuarios_adicionales: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: "cuentas",
    name: {
        singular: "Cuenta",
        plural: "Cuentas"
    }
})

module.exports = {
    Cuenta
}