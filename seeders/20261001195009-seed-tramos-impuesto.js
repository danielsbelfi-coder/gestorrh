'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("tramos_impuesto", [
      {
        desde_utm: 0,
        hasta_utm: 13.5,
        tasa: 0,
        rebaja_utm: 0,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 13.6,
        hasta_utm: 30,
        tasa: 4,
        rebaja_utm: 0.54,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 30.1,
        hasta_utm: 50,
        tasa: 8,
        rebaja_utm: 1.74,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 50.1,
        hasta_utm: null,
        tasa: 13.5,
        rebaja_utm: 4.49,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("tramos_impuesto", {vigencia_desde: "2026-01-01"})
  }
};