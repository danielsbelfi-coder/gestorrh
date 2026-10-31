'use strict';

// Técnico extranjero (Ley 18.156): exento de AFP, SIS y aportes de la reforma; cotiza salud, cesantía y mutual.
// Ver «Técnico extranjero (Ley 18.156)» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("situaciones_previsionales", "tecnico_extranjero", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("situaciones_previsionales", "tecnico_extranjero")
  }
};
