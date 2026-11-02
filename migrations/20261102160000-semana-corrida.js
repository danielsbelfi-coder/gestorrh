'use strict';

// Semana corrida (art. 45): marca «devengo diario» por concepto, concepto SEMANA_CORRIDA (LRE 2104) y concepto común
// TRATO (LRE 2112). Las comisiones y los tratos quedan marcados. Ver «Semana corrida (art. 45)» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("conceptos_remuneracion", "devengo_diario", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    const ahora = new Date()
    const conceptos = [
      ["SEMANA_CORRIDA", "Semana corrida (art. 45)", 2104, true, false],
      ["TRATO", "Tratos", 2112, false, true]
    ]
    for (const [codigo, nombre, lre, sistema, diario] of conceptos) {
      await queryInterface.sequelize.query(`
        INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
          recargo_hora_extra, calculado_por_sistema, codigo_lre, devengo_diario, activo, "createdAt", "updatedAt")
        SELECT NULL, :codigo, :nombre, 'haber', true, true, true, NULL, :sistema, :lre, :diario, true, :ahora, :ahora
        WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = :codigo)
      `, { replacements: { codigo, nombre, lre, sistema, diario, ahora } })
    }
    await queryInterface.sequelize.query(`
      UPDATE conceptos_remuneracion SET devengo_diario = true WHERE empresa_id IS NULL AND codigo IN ('COMISION', 'TRATO')
    `)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("conceptos_remuneracion", { empresa_id: null, codigo: ["SEMANA_CORRIDA", "TRATO"] })
    await queryInterface.removeColumn("conceptos_remuneracion", "devengo_diario")
  }
};
