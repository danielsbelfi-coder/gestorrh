'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("situaciones_previsionales", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      persona_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "personas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      pensionado: { type: Sequelize.BOOLEAN, allowNull: false },
      cotiza_afp: { type: Sequelize.BOOLEAN, allowNull: false },
      tipo_pension: {
        type: Sequelize.ENUM("vejez", "invalidez_total", "invalidez_parcial", "sobrevivencia"),
        allowNull: true
      },
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

    await queryInterface.addIndex("situaciones_previsionales", ["persona_id", "desde"], {
      unique: true,
      name: "situaciones_previsionales_persona_desde_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("situaciones_previsionales")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_situaciones_previsionales_tipo_pension";`)
  }
};
