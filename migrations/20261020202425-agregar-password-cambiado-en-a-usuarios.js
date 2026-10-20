'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "password_cambiado_en", {
      type: Sequelize.DATE,
      allowNull: true
    });
    
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("usuarios", "password_cambiado_en");    
  }
};