'use strict';

// Feriado progresivo (art. 68): años trabajados con empleadores anteriores (máximo 10 se reconocen), con su respaldo
// (certificado de cotizaciones de la AFP). Ver «Módulo de vacaciones, parte 2» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("personas", "anios_previos_progresivo", { type: Sequelize.INTEGER, allowNull: true })
    await queryInterface.addColumn("personas", "respaldo_progresivo", { type: Sequelize.STRING(200), allowNull: true })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("personas", "respaldo_progresivo")
    await queryInterface.removeColumn("personas", "anios_previos_progresivo")
  }
};
