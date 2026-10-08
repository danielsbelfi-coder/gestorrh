'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", [
      {
        codigo: "TASA_CESANTIA_TRABAJADOR",
        nombre: "tasa Seguro de cesantia del trabajador",
        valor: 0.6,
        tipo: "monto",
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        descripcion: "0.6% de cotización obligatoria seguro de cesantía",
        fuente: "https://www.previred.com/indicadores-previsionales/",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "TOPE_CESANTIA_UF",
        nombre: "tope en uf seguro de cesantia",
        valor: 135.2,
        tipo: "monto",
        vigencia_desde: "2026-02-01",
        vigencia_hasta: null,
        descripcion: "tope en UF de cotización obligatoria seguro de cesantía",
        fuente: "https://www.previred.com/indicadores-previsionales/",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", {
      codigo: "TASA_CESANTIA_TRABAJADOR"
    });
    await queryInterface.bulkDelete("parametros_legales", {
      codigo: "TOPE_CESANTIA_UF"
    });

  }
};