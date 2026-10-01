'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("cargos", ["empresa_id", "nombre"], {
      unique: true,
      name: "cargos_empresa_id_nombre_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("cargos", "cargos_empresa_id_nombre_unique")
  }
};
