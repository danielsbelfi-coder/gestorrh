'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "es_soporte_plataforma", {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("usuarios", "es_soporte_plataforma")
  }
};