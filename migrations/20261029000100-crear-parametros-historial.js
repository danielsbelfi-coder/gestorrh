'use strict';

// Historial de cambios de los parámetros legales comunes (UF, UTM, topes, tasas, tramos...).
// Solo lo ve soporte: sirve para saber quién cambió qué y cuándo (y si se cargó a tiempo para el mes).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("parametros_historial", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      accion: { type: Sequelize.ENUM("correccion", "apertura_mes"), allowNull: false },
      parametro_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "parametros_legales", key: "id" }, onDelete: "SET NULL" },
      codigo: { type: Sequelize.STRING, allowNull: false },
      vigencia_desde: { type: Sequelize.DATEONLY, allowNull: false },
      valor_anterior: { type: Sequelize.DECIMAL, allowNull: true },
      valor_nuevo: { type: Sequelize.DECIMAL, allowNull: true },
      detalle: { type: Sequelize.TEXT, allowNull: true },
      usuario_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("parametros_historial", ["createdAt"])
  },

  async down(queryInterface) {
    await queryInterface.dropTable("parametros_historial")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_parametros_historial_accion"')
  }
};
