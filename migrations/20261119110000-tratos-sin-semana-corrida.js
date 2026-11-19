'use strict';

// Paquete N (criterio de Daniel, 19-11-2026): el trato de faena se paga por terminar una labor (una tarea dentro de la
// faena), no se gana día a día, y no genera semana corrida (art. 45). El concepto común «Tratos» deja de contar como
// variable de devengo diario. La comisión, cuyo devengo sí es diario, queda marcada: en una base creada con migraciones y
// después datos base (sembrar-base), la migración de semana corrida corría antes de que existiera la comisión y quedaba
// sin marcar (el seeder ahora la trae marcada). Si una empresa paga un trato por
// producción diaria, crea su propio concepto con «Variable de devengo diario». Las liquidaciones ya calculadas no cambian;
// las de meses abiertos se recalculan.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE conceptos_remuneracion SET devengo_diario = false, "updatedAt" = now() WHERE empresa_id IS NULL AND codigo = 'TRATO'
    `)
    await queryInterface.sequelize.query(`
      UPDATE conceptos_remuneracion SET devengo_diario = true, "updatedAt" = now() WHERE empresa_id IS NULL AND codigo = 'COMISION'
    `)
  },

  // Vuelve el trato a la semana corrida. La comisión queda marcada (era lo que buscaba la migración de semana corrida).
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE conceptos_remuneracion SET devengo_diario = true, "updatedAt" = now() WHERE empresa_id IS NULL AND codigo = 'TRATO'
    `)
  }
};
