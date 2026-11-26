'use strict';

// Paquete AJ: los domingos del art. 38 bis no otorgados al término (Ord. DT 806/14) se pagan como remuneración en la
// última liquidación (imponible y tributable, LRE 2123 «otras remuneraciones superiores a un mes»), ya no en el finiquito.
// La columna finiquitos.monto_domingos_38bis se conserva por los finiquitos ya calculados, pero no se vuelve a llenar.
module.exports = {
  async up(queryInterface) {
    const ahora = new Date()
    await queryInterface.sequelize.query(`
      INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
        recargo_hora_extra, calculado_por_sistema, codigo_lre, devengo_diario, activo, "createdAt", "updatedAt")
      SELECT NULL, 'DOMINGOS_38BIS', 'Domingos art. 38 bis no otorgados', 'haber', true, true, true, NULL, true, 2123, false, true, :ahora, :ahora
      WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'DOMINGOS_38BIS')
    `, { replacements: { ahora } })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'DOMINGOS_38BIS'
        AND NOT EXISTS (SELECT 1 FROM liquidacion_lineas l WHERE l.concepto_id = conceptos_remuneracion.id)
    `)
  }
};
