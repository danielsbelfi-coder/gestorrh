'use strict';

// DJ 1887: factores de actualización del SII (uno por mes, comunes a todas las cuentas) y empresa agrícola
// (códigos A/B del mes). Ver «DJ 1887 (sueldos) y Certificado N° 6» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("factores_actualizacion", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      anio: { type: Sequelize.INTEGER, allowNull: false },
      mes: { type: Sequelize.INTEGER, allowNull: false },
      factor: { type: Sequelize.DECIMAL(6, 3), allowNull: false },
      usuario_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("factores_actualizacion", ["anio", "mes"], { unique: true, name: "factores_actualizacion_anio_mes" })
    await queryInterface.addColumn("empresas", "es_agricola", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("empresas", "es_agricola")
    await queryInterface.dropTable("factores_actualizacion")
  }
};
