'use strict';

// Depósito convenido sobre 900 UF anuales: haber tributable, no imponible (art. 20 del D.L. 3.500). En el LRE va
// junto al depósito convenido (2347), porque la DT no tiene un código para el exceso.
// Ver «Depósito convenido: tope de 900 UF anuales» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date()
    await queryInterface.sequelize.query(`
      INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
        recargo_hora_extra, calculado_por_sistema, codigo_lre, activo, "createdAt", "updatedAt")
      SELECT NULL, 'DEPOSITO_CONVENIDO_EXCESO', 'Depósito convenido sobre 900 UF', 'haber', false, true, false, NULL, true, 2347, true, :ahora, :ahora
      WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'DEPOSITO_CONVENIDO_EXCESO')
    `, { replacements: { ahora } })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("conceptos_remuneracion", { empresa_id: null, codigo: "DEPOSITO_CONVENIDO_EXCESO" })
  }
};
