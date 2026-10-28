'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("jornadas", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      empresa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "empresas", key: "id" } },
      nombre: { type: Sequelize.STRING(80), allowNull: false },
      tipo: { type: Sequelize.ENUM("semanal"), allowNull: false, defaultValue: "semanal" },
      dias: { type: Sequelize.JSONB, allowNull: false },
      horas_semanales: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      dias_trabajados: { type: Sequelize.SMALLINT, allowNull: false },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("jornadas", ["empresa_id", "nombre"], { unique: true, name: "jornadas_empresa_nombre_unique" })

    await queryInterface.addColumn("contratos_trabajo", "jornada_id", {
      type: Sequelize.INTEGER, allowNull: true, references: { model: "jornadas", key: "id" }
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("contratos_trabajo", "jornada_id")
    await queryInterface.dropTable("jornadas")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jornadas_tipo";')
  }
};
