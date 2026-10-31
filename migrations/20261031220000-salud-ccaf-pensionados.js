'use strict';

// Pensionados en Fonasa de un empleador con caja: del 7 % de salud, el 1 % va a la CCAF y el 6 % a Fonasa
// (los activos: 4,2 % y 2,8 %, TASA_SALUD_CCAF). Ver «CCAF: salud de los pensionados» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date()
    await queryInterface.sequelize.query(`
      INSERT INTO parametros_legales (codigo, nombre, valor, tipo, vigencia_desde, vigencia_hasta, descripcion, fuente, "createdAt", "updatedAt")
      SELECT 'TASA_SALUD_CCAF_PENSIONADOS', 'Cotización de salud Fonasa de pensionados que va a la CCAF', 1, 'porcentaje', '2026-01-01', NULL,
        'Empresa afiliada a una caja: del 7 % de Fonasa de un pensionado, este porcentaje va a la CCAF (campo 90 de Previred) y el resto a Fonasa (campo 70)',
        'https://www.previred.com/indicadores-previsionales/', :ahora, :ahora
      WHERE NOT EXISTS (SELECT 1 FROM parametros_legales WHERE codigo = 'TASA_SALUD_CCAF_PENSIONADOS')
    `, { replacements: { ahora } })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: "TASA_SALUD_CCAF_PENSIONADOS" })
  }
};
