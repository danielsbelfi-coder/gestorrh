const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Liquidacion = sequelize.define("Liquidacion", {
    periodo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    trabajador_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    snapshot_contrato: {
        type: DataTypes.JSON,
        allowNull: false
    },
    dias_trabajados: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dias_periodo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
    },
    sueldo_base_proporcional: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    total_haberes: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    descuento_afp: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    descuento_salud: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    total_descuentos: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    liquido_a_pagar: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    horas_extra: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    valor_hora_extra: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    monto_horas_extra: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    monto_gratificacion: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    monto_impuesto_unico: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    detalle_calculo: {
        type: DataTypes.JSON,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM(
            "calculada",
            "cerrada",
        ),
        allowNull: false,
        defaultValue: "calculada"
    },
    fecha_calculo: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
}, {
    tableName: "liquidaciones",
    indexes: [
        {
            unique: true,
            fields: ["periodo_id", "trabajador_id"]
        }
    ]
}
)

module.exports = {
    Liquidacion
}