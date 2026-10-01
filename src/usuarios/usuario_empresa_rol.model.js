const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const UsuarioEmpresaRol = sequelize.define("UsuarioEmpresaRol", {
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    rol_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM(
            "activo",
            "inactivo"
        ),
        defaultValue: "activo"
    }
}, {
    tableName: "usuarios_empresas_roles",
    indexes: [
        {
            unique: true,
            fields: ["empresa_id", "usuario_id"]
        }
    ]
})

module.exports = {
    UsuarioEmpresaRol
}