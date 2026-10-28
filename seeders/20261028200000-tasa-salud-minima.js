'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Si la base ya tiene el parámetro (cargado a mano antes), no se duplica.
    const [existentes] = await queryInterface.sequelize.query(
      "SELECT id FROM parametros_legales WHERE codigo = 'TASA_SALUD_MINIMA' LIMIT 1"
    )
    if (existentes.length > 0) {
      return
    }

    await queryInterface.bulkInsert("parametros_legales", [
      {
        codigo: "TASA_SALUD_MINIMA",
        nombre: "Cotización mínima de salud",
        valor: 7,
        tipo: "porcentaje",
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        descripcion: "7% de cotización de salud obligatoria (Fonasa o Isapre)",
        fuente: "https://www.previred.com/indicadores-previsionales/",
        createdAt: new Date(),
        updatedAt: new Date()
      }])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: "TASA_SALUD_MINIMA" })
  }
};
