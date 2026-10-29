const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Campos que no se leen por defecto ni se envían al navegador.
const CAMPOS_PRIVADOS = ["password_hash", "totp_secreto_cifrado", "totp_ultimo_paso"]

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
    // Verificación en dos pasos (TOTP). El secreto va cifrado (src/auth/cifrado.js) y nunca sale en una respuesta.
    totp_secreto_cifrado: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    totp_activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    totp_activado_en: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Último intervalo de 30 s usado, para que un código no sirva dos veces.
    totp_ultimo_paso: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
}, {
    tableName: "usuarios",
    defaultScope: {
        attributes: { exclude: CAMPOS_PRIVADOS }
    }
},
)
// Nunca se envían al navegador, aunque se haya leído el usuario con unscoped().
Usuario.prototype.toJSON = function () {
    const valores = { ...this.get() }
    for (const campo of CAMPOS_PRIVADOS) {
        delete valores[campo]
    }
    return valores
}

module.exports = {
    Usuario,
    CAMPOS_PRIVADOS
}