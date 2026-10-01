'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("liquidaciones", "monto_impuesto_unico", {
              type: Sequelize.DECIMAL,
              allowNull: false,
              defaultValue: 0
          
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("liquidaciones", "monto_impuesto_unico")
  }
};