'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tramos_impuesto", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      desde_utm: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      hasta_utm: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      tasa: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      rebaja_utm: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      vigencia_desde: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      vigencia_hasta: {
        type: Sequelize.DATEONLY,
        allowNull: true,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("tramos_impuesto")
  }
};