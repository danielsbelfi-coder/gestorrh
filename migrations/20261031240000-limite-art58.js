'use strict';

// Art. 58 del Código del Trabajo: los descuentos voluntarios no pueden pasar del 15 % de la remuneración total.
// Marca por concepto; los comunes que cuentan: préstamo de la empresa, seguro colectivo y otros descuentos.
// Ver «Art. 58: límite del 15 % de los descuentos voluntarios» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("conceptos_remuneracion", "limite_art58", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    await queryInterface.sequelize.query(`
      UPDATE conceptos_remuneracion SET limite_art58 = true
      WHERE empresa_id IS NULL AND codigo IN ('PRESTAMO_EMPRESA', 'SEGURO_COLECTIVO', 'OTROS_DESCUENTOS')
    `)
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("conceptos_remuneracion", "limite_art58")
  }
};
