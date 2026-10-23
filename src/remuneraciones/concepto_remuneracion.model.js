const { DataTypes, Op } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const ConceptoRemuneracion = sequelize.define("ConceptoRemuneracion", {
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: true
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
        type: DataTypes.ENUM("haber", "descuento"),
        allowNull: false
    },
    imponible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    tributable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    base_gratificacion: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    recargo_hora_extra: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    calculado_por_sistema: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    codigo_lre: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: "conceptos_remuneracion",
    name: {
        singular: "ConceptoRemuneracion",
        plural: "ConceptosRemuneracion"
    },
    indexes: [
        {
            unique: true,
            fields: ["codigo"],
            where: { empresa_id: null },
            name: "conceptos_codigo_comun_unique"
        },
        {
            unique: true,
            fields: ["empresa_id", "codigo"],
            where: { empresa_id: { [Op.ne]: null } },
            name: "conceptos_empresa_codigo_unique"
        }
    ]
})

module.exports = {
    ConceptoRemuneracion
}