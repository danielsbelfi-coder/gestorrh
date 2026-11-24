'use strict';

// Paquete AC: saldo de tiempo compensatorio de las esperas del art. 25 que se compensan con descanso.
// - descansos_compensatorios: descanso otorgado (fecha y minutos), con aprobación como los turnos.
// - Concepto común «Saldo de tiempo compensatorio»: el saldo sin usar al término de la relación se paga en la última
//   liquidación, al valor hora de esa liquidación. Imponible, tributable, base de gratificación, LRE 2113 (como el
//   tiempo de espera). Lo calcula el sistema: no se ingresa como variable. Ver «Paquete AC» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("descansos_compensatorios", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "trabajadores", key: "id" }, onDelete: "CASCADE" },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      minutos: { type: Sequelize.INTEGER, allowNull: false },
      observaciones: { type: Sequelize.STRING(300), allowNull: true },
      estado_aprobacion: { type: Sequelize.ENUM("pendiente", "aprobado"), allowNull: false, defaultValue: "pendiente" },
      usuario_registro_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" } },
      aprobado_por_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" } },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("descansos_compensatorios", ["trabajador_id", "fecha"], { name: "descansos_compensatorios_trabajador_fecha" })

    const ahora = new Date()
    await queryInterface.sequelize.query(`
      INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
        recargo_hora_extra, calculado_por_sistema, codigo_lre, devengo_diario, activo, "createdAt", "updatedAt")
      SELECT NULL, 'SALDO_COMPENSATORIO', 'Saldo de tiempo compensatorio', 'haber', true, true, true, NULL, true, 2113, false, true, :ahora, :ahora
      WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'SALDO_COMPENSATORIO')
    `, { replacements: { ahora } })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'SALDO_COMPENSATORIO'
        AND NOT EXISTS (SELECT 1 FROM liquidacion_lineas l WHERE l.concepto_id = conceptos_remuneracion.id)
    `)
    await queryInterface.dropTable("descansos_compensatorios")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_descansos_compensatorios_estado_aprobacion"`)
  }
};
