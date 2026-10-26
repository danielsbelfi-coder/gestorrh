'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("licencias_medicas", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "trabajadores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      fecha_inicio: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_termino: { type: Sequelize.DATEONLY, allowNull: false },
      folio: { type: Sequelize.STRING, allowNull: true },
      tipo: { type: Sequelize.ENUM("comun", "maternal", "accidente_trabajo"), allowNull: false },
      pagador_rut: { type: Sequelize.STRING(10), allowNull: false },
      pagador_dv: { type: Sequelize.STRING(1), allowNull: false },
      usuario_registro_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })

    await queryInterface.addIndex("licencias_medicas", ["trabajador_id"])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("licencias_medicas")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_licencias_medicas_tipo";`)
  }
};