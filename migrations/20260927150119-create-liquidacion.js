'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("liquidaciones", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      periodo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "periodos_remuneracion",
          key: "id"
        }
      },
      trabajador_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "trabajadores",
          key: "id"
        }
      },
      snapshot_contrato: {
        type: Sequelize.JSON,
        allowNull: false
      },
      dias_trabajados: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      dias_periodo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      sueldo_base_proporcional: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      total_haberes: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      descuento_afp: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      descuento_salud: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      total_descuentos: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      liquido_a_pagar: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      detalle_calculo: {
        type: Sequelize.JSON,
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM(
          "calculada",
          "cerrada",
        ),
        allowNull: false,
        defaultValue: "calculada"
      },
      fecha_calculo: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    })
    await queryInterface.addIndex("liquidaciones", ["trabajador_id", "periodo_id"], {
      unique: true,
      name: "liquidaciones_trabajador_periodo_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("liquidaciones", "liquidaciones_trabajador_periodo_unique")
    await queryInterface.dropTable("liquidaciones")
  }
};
