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
    rol_plataforma: {
        type: DataTypes.ENUM("soporte", "comercial"),
        allowNull: true
    },
    cuenta_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    es_admin_cuenta: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    // El administrador que creó el comercial al dar de alta la cuenta. Solo él mismo o soporte lo modifican.
    es_admin_principal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    debe_cambiar_password: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    password_cambiado_en: {
        type: DataTypes.DATE,
        allowNull: true
    },
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