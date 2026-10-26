const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const LicenciaMedica = sequelize.define("LicenciaMedica", {
    trabajador_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fecha_termino: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    folio: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM("comun", "maternal", "accidente_trabajo"),
        allowNull: false
    },
    pagador_rut: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    pagador_dv: {
        type: DataTypes.STRING(1),
        allowNull: false
    },
    usuario_registro_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: "licencias_medicas",
    name: {
        singular: "LicenciaMedica",
        plural: "LicenciasMedicas"
    }
})

module.exports = {
    LicenciaMedica
}