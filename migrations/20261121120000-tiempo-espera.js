'use strict';

// Paquete W: concepto común «Tiempo de espera» (art. 25, choferes y auxiliares interurbanos) y fuente «turnos» para las
// variables que se proponen desde los turnos de conducción. Remuneración imponible y tributable, variable mes a mes:
// LRE 2113 «Bonos u otras remuneraciones variables mensuales o superiores a un mes» (criterio de Daniel, 21-11-2026).
// No genera semana corrida (devengo_diario false). Ver «Paquete W» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date()
    await queryInterface.sequelize.query(`
      INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
        recargo_hora_extra, calculado_por_sistema, codigo_lre, devengo_diario, activo, "createdAt", "updatedAt")
      SELECT NULL, 'TIEMPO_ESPERA', 'Tiempo de espera', 'haber', true, true, true, NULL, false, 2113, false, true, :ahora, :ahora
      WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'TIEMPO_ESPERA')
    `, { replacements: { ahora } })
    await queryInterface.sequelize.query(`ALTER TYPE "enum_variables_periodo_fuente" ADD VALUE IF NOT EXISTS 'turnos'`)
  },

  async down(queryInterface) {
    // Las variables propuestas desde los turnos quedan como manuales (el valor 'turnos' del tipo no se puede quitar).
    await queryInterface.sequelize.query(`UPDATE variables_periodo SET fuente = 'manual' WHERE fuente = 'turnos'`)
    await queryInterface.sequelize.query(`
      DELETE FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'TIEMPO_ESPERA'
        AND NOT EXISTS (SELECT 1 FROM variables_periodo v WHERE v.concepto_id = conceptos_remuneracion.id)
        AND NOT EXISTS (SELECT 1 FROM liquidacion_lineas l WHERE l.concepto_id = conceptos_remuneracion.id)
    `)
  }
};
