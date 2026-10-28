'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("contratos_trabajo", "motivo_anulacion", { type: Sequelize.TEXT, allowNull: true })
    await queryInterface.addColumn("contratos_trabajo", "fecha_anulacion", { type: Sequelize.DATEONLY, allowNull: true })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("contratos_trabajo", "fecha_anulacion")
    await queryInterface.removeColumn("contratos_trabajo", "motivo_anulacion")
  }
};
