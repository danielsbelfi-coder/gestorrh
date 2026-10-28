'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("planes", "nombre_visible", { type: Sequelize.STRING, allowNull: true })
    await queryInterface.addColumn("planes", "precio_uf", { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 })
    await queryInterface.addColumn("planes", "precio_usuario_adicional_uf", { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("planes", "precio_usuario_adicional_uf")
    await queryInterface.removeColumn("planes", "precio_uf")
    await queryInterface.removeColumn("planes", "nombre_visible")
  }
};
