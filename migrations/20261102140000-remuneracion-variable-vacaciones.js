'use strict';

// Art. 71: remuneración variable pagada en vacaciones (promedio de los últimos 3 meses), LRE 2108.
// Ver «Art. 71: remuneración variable en vacaciones» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date()
    await queryInterface.sequelize.query(`
      INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
        recargo_hora_extra, calculado_por_sistema, codigo_lre, activo, "createdAt", "updatedAt")
      SELECT NULL, 'REMUNERACION_VARIABLE_VACACIONES', 'Remuneración variable en vacaciones (art. 71)', 'haber', true, true, true, NULL, true, 2108, true, :ahora, :ahora
      WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'REMUNERACION_VARIABLE_VACACIONES')
    `, { replacements: { ahora } })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("conceptos_remuneracion", { empresa_id: null, codigo: "REMUNERACION_VARIABLE_VACACIONES" })
  }
};
