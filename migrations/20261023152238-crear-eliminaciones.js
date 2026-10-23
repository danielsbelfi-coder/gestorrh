'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("eliminaciones", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM("empresa", "cuenta"),
        allowNull: false
      },
      registro_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      rut: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dv: {
        type: Sequelize.STRING(1),
        allowNull: false
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false
      },
      filas_por_tabla: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("eliminaciones")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_eliminaciones_tipo";')
  }
};