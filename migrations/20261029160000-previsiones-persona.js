'use strict';

// Historial de previsión (AFP y salud) por mes de cada persona. Ver «Historial de previsión» en el SPEC.
// La previsión actual de cada persona pasa a ser su fila «desde siempre» (1900-01-01).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("previsiones_persona", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      persona_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "personas", key: "id" }, onDelete: "CASCADE" },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      afp_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "afps", key: "id" }, onDelete: "RESTRICT" },
      sistema_salud: { type: Sequelize.ENUM("Fonasa", "Isapre"), allowNull: true },
      isapre_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "isapres", key: "id" }, onDelete: "RESTRICT" },
      plan_isapre_uf: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
      usuario_registro_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("previsiones_persona", ["persona_id", "desde"], { unique: true, name: "previsiones_persona_persona_desde_unique" })

    await queryInterface.sequelize.query(`
      INSERT INTO previsiones_persona (persona_id, desde, afp_id, sistema_salud, isapre_id, plan_isapre_uf, "createdAt", "updatedAt")
      SELECT id, '1900-01-01', afp_id, sistema_salud::text::"enum_previsiones_persona_sistema_salud", isapre_id, plan_isapre_uf, NOW(), NOW()
      FROM personas
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("previsiones_persona")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_previsiones_persona_sistema_salud"')
  }
};
