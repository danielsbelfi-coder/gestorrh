'use strict';

// Saldo de pago en exceso que el finiquito no alcanzó a descontar: se puede marcar «no se cobrará» (con motivo).
// Ver «Saldo pendiente de una relación anterior» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("finiquitos", "saldo_no_cobrar_motivo", { type: Sequelize.TEXT, allowNull: true })
    await queryInterface.addColumn("finiquitos", "saldo_no_cobrar_en", { type: Sequelize.DATE, allowNull: true })
    await queryInterface.addColumn("finiquitos", "saldo_no_cobrar_usuario_id", { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" })
  },

  async down(queryInterface) {
    for (const columna of ["saldo_no_cobrar_usuario_id", "saldo_no_cobrar_en", "saldo_no_cobrar_motivo"]) {
      await queryInterface.removeColumn("finiquitos", columna)
    }
  }
};
