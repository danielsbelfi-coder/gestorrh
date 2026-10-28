'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("empresas", "comuna", { type: Sequelize.STRING(5), allowNull: true })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("empresas", "comuna")
  }
};
