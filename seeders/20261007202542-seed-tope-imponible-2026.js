'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", [
      {
        codigo: "TOPE_IMPONIBLE_UF",
        nombre: "Tope imponible AFP, salud y accidentes del trabajo (UF)",
        tipo: "monto",
        descripcion: "90,0 UF aplicable desde las remuneraciones de febrero de 2026",
        valor: 90,
        vigencia_desde: "2026-02-01",
        vigencia_hasta: null,
        fuente: "https://www.spensiones.cl/portal/institucional/594/w3-article-16921.html",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ]
  )}
  ,

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: "TOPE_IMPONIBLE_UF" })
  }
};
