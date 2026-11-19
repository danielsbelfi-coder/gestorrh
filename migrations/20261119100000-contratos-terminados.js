'use strict';

// Paquete J: al registrar el término de una relación laboral, su contrato queda «terminado» (antes seguía «vigente»).
// Esta migración pone al día los datos que ya existen: contratos vigentes de relaciones con término registrado.
// La relación con término queda «desvinculado». Solo datos, sin cambios de estructura.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        UPDATE contratos_trabajo c SET estado = 'terminado', "updatedAt" = now()
        FROM trabajadores t
        WHERE c.trabajador_id = t.id AND t.fecha_termino IS NOT NULL AND c.estado = 'vigente'`, { transaction })
      await queryInterface.sequelize.query(`
        UPDATE trabajadores SET estado = 'desvinculado', "updatedAt" = now()
        WHERE fecha_termino IS NOT NULL AND estado IN ('activo', 'suspendido', 'con_licencia')`, { transaction })
    })
  },

  // Antes de este paquete ningún contrato quedaba «terminado»: vuelven todos a «vigente».
  // El estado de las relaciones no se revierte (con término, «desvinculado» ya era lo esperado).
  async down(queryInterface) {
    await queryInterface.sequelize.query(`UPDATE contratos_trabajo SET estado = 'vigente', "updatedAt" = now() WHERE estado = 'terminado'`)
  }
};
