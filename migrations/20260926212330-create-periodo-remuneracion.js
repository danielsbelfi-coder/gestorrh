'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("periodos_remuneracion", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "empresas",
          key: "id"
        }
      },
      mes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      anio: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM(
          "abierto",
          "cerrado"
        ),
        defaultValue: "abierto"
      },
      fecha_apertura: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      fecha_cierre: {
        type: Sequelize.DATEONLY,
        allowNull: true
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
    await queryInterface.addIndex("periodos_remuneracion", ["empresa_id", "mes", "anio"], {
      unique: true,
      name: "periodos_remuneracion_empresa_mes_anio_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("periodos_remuneracion", "periodos_remuneracion_empresa_mes_anio_unique")
    await queryInterface.dropTable("periodos_remuneracion")
  }
};