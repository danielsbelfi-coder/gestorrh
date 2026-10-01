'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("liquidaciones", "monto_gratificacion", {
              type: Sequelize.DECIMAL,
              allowNull: false,
              defaultValue: 0
          
    })
  },

  async down (queryInterface, Sequelize) {
   await queryInterface.removeColumn("liquidaciones", "monto_gratificacion")
  }
};