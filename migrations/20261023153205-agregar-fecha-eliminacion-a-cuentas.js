'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cuentas", "fecha_eliminacion_datos", {
      type: Sequelize.DATEONLY,
      allowNull: true
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("cuentas", "fecha_eliminacion_datos")
  }
};