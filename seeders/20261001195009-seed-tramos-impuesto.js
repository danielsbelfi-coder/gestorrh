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
        desde_utm: 13.5,
        hasta_utm: 30,
        tasa: 4,
        rebaja_utm: 0.54,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 30,
        hasta_utm: 50,
        tasa: 8,
        rebaja_utm: 1.74,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 50,
        hasta_utm: 70,
        tasa: 13.5,
        rebaja_utm: 4.49,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 70,
        hasta_utm: 90,
        tasa: 23,
        rebaja_utm: 11.14,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 90,
        hasta_utm: 120,
        tasa: 30.4,
        rebaja_utm: 17.8,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 120,
        hasta_utm: 310,
        tasa: 35,
        rebaja_utm: 23.32,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        desde_utm: 310,
        hasta_utm: null,
        tasa: 40,
        rebaja_utm: 38.82,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("tramos_impuesto", { vigencia_desde: "2026-01-01" })
  }
};