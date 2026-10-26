'use strict';

const TABLAS = ["afps", "isapres", "mutualidades"]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tabla of TABLAS) {
      await queryInterface.addColumn(tabla, "codigo_previred", {
        type: Sequelize.STRING(2),
        allowNull: true
      })
    }
  },

  async down(queryInterface, Sequelize) {
    for (const tabla of TABLAS) {
      await queryInterface.removeColumn(tabla, "codigo_previred")
    }
  }
};