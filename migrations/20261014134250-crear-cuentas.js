'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cuentas", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false
      },
      rut_titular: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dv_titular: {
        type: Sequelize.STRING(1),
        allowNull: false
      },
      razon_social_titular: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email_contacto: {
        type: Sequelize.STRING,
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM(
          "activa",
          "suspendida",
          "cancelada"
        ),
        allowNull: false,
        defaultValue: "activa"
      },
      fecha_cancelacion: {
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
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("cuentas");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cuentas_estado"')
  }
};
