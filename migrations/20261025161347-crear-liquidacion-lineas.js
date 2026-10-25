'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("liquidacion_lineas", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      liquidacion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "liquidaciones", key: "id" }
      },
      concepto_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "conceptos_remuneracion", key: "id" }
      },
      codigo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM("haber", "descuento"),
        allowNull: false
      },
      imponible: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      tributable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      base_gratificacion: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      cantidad: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      monto: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      orden: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addIndex("liquidacion_lineas", ["liquidacion_id"], {
      name: "liquidacion_lineas_liquidacion"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("liquidacion_lineas")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_liquidacion_lineas_tipo";')
  }
};
