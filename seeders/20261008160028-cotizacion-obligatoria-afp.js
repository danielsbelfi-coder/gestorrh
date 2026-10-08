'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", [
      {
        codigo: "COTIZACION_OBLIGATORIA_AFP",
        nombre: "Cotización obligatoria AFP",
        valor: 10,
        tipo: "monto",
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        descripcion: "10% de cotización obligatoria AFP",
        fuente: "https://www.previred.com/indicadores-previsionales/",
        createdAt: new Date(),
        updatedAt: new Date()
      }])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", {
      codigo: "COTIZACION_OBLIGATORIA_AFP"
    })
  }
};
