'use strict';

const TABLAS_CODIGO_LRE = ["afps", "isapres", "mutualidades"]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("contratos_trabajo", "comuna_prestacion", { type: Sequelize.STRING(5), allowNull: true })
    await queryInterface.addColumn("trabajadores", "causal_termino", { type: Sequelize.SMALLINT, allowNull: true })

    for (const tabla of TABLAS_CODIGO_LRE) {
      await queryInterface.addColumn(tabla, "codigo_lre", { type: Sequelize.SMALLINT, allowNull: true })
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("contratos_trabajo", "comuna_prestacion")
    await queryInterface.removeColumn("trabajadores", "causal_termino")

    for (const tabla of TABLAS_CODIGO_LRE) {
      await queryInterface.removeColumn(tabla, "codigo_lre")
    }
  }
};
