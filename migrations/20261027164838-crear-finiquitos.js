'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const usuario = {
      type: Sequelize.INTEGER,
      references: { model: "usuarios", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    }

    await queryInterface.createTable("finiquitos", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "trabajadores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      fecha_finiquito: { type: Sequelize.DATEONLY, allowNull: false },
      lugar: { type: Sequelize.STRING(100), allowNull: false },
      aviso_previo_dado: { type: Sequelize.BOOLEAN, allowNull: false },
      dias_tomados: { type: Sequelize.DECIMAL(6, 2), allowNull: false },
      dias_inhabiles: { type: Sequelize.INTEGER, allowNull: false },
      imputacion_afc: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      descuentos: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      monto_feriado: { type: Sequelize.INTEGER, allowNull: false },
      monto_aviso_previo: { type: Sequelize.INTEGER, allowNull: false },
      monto_anios_servicio: { type: Sequelize.INTEGER, allowNull: false },
      total_descuentos: { type: Sequelize.INTEGER, allowNull: false },
      total_a_pagar: { type: Sequelize.INTEGER, allowNull: false },
      detalle_calculo: { type: Sequelize.JSONB, allowNull: false },
      estado: { type: Sequelize.ENUM("calculado", "emitido", "pagado"), allowNull: false, defaultValue: "calculado" },
      fecha_emision: { type: Sequelize.DATE, allowNull: true },
      fecha_pago: { type: Sequelize.DATEONLY, allowNull: true },
      emitido_por_id: { ...usuario, allowNull: true },
      usuario_registro_id: { ...usuario, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("finiquitos")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_finiquitos_estado";`)
  }
};