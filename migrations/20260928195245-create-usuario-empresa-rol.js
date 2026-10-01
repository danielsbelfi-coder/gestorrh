'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("usuarios_empresas_roles", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "usuarios",
          key: "id"
        }
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "empresas",
          key: "id"
        }
      },
      rol_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "roles",
          key: "id"
        }
      },
      estado: {
        type: Sequelize.ENUM(
          "activo",
          "inactivo"
        ),
        defaultValue: "activo"
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
    await queryInterface.addIndex("usuarios_empresas_roles", ["usuario_id", "empresa_id"], {
      unique: true,
      name: "usuarios_empresas_roles_usuario_empresa_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("usuarios_empresas_roles", "usuarios_empresas_roles_usuario_empresa_unique")
    await queryInterface.dropTable("usuarios_empresas_roles")
  }
};