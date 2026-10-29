'use strict';

// Montos de la asignación familiar por tramo, para cada mes que tenga los límites de tramo (va después de su seeder).
// En una base que ya existía, los crea la migración 20261029200000-cargas-familiares.
const { insertarMontosFaltantes, CODIGOS_MONTOS } = require("../src/remuneraciones/montos_asignacion_familiar.js")

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await insertarMontosFaltantes(queryInterface)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: Object.values(CODIGOS_MONTOS) })
  }
};
