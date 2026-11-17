const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const ContratoAnexo = sequelize.define("ContratoAnexo", {
    contrato_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    fecha_vigencia: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    campo_modificado: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // TEXT: el anexo de sucursal guarda sucursal, lugar y comuna juntos (ver anexo_sucursal.js).
    valor_anterior: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    valor_nuevo: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    estado_firma: {
        type: DataTypes.ENUM("pendiente", "firmado", "rechazado"),
        defaultValue: "pendiente"
    },
    fecha_firma: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    usuario_creo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    usuario_firmo_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: "contratos_anexo"
}
)

module.exports = {
    ContratoAnexo
}