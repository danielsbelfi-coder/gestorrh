'use strict';

const MESES = [
  { vigencia_desde: "2026-10-01", vigencia_hasta: "2026-10-31" },
  { vigencia_desde: "2027-07-01", vigencia_hasta: "2027-07-31" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", MESES.map((mes) => ({
      codigo: "CESANTIA_EMPLEADOR_11_ANIOS",
      nombre: "Cesantía empleador, indefinido con 11 años o más",
      valor: 0.8,
      tipo: "porcentaje",
      descripcion: "Aporte del empleador al Fondo de Cesantía Solidario desde los 11 años de relación laboral",
      fuente: "https://www.previred.com/indicadores-previsionales/",
      ...mes,
      createdAt: new Date(),
      updatedAt: new Date()
    })))
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: "CESANTIA_EMPLEADOR_11_ANIOS" })
  }
};
