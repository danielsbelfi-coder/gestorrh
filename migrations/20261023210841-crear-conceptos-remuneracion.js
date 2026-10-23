'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("conceptos_remuneracion", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "empresas",
          key: "id"
        }
      },
      codigo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM("haber", "descuento"),
        allowNull: false
      },
      imponible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      tributable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      base_gratificacion: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      recargo_hora_extra: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      calculado_por_sistema: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      codigo_lre: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex("conceptos_remuneracion", ["codigo"], {
      unique: true,
      where: { empresa_id: null },
      name: "conceptos_codigo_comun_unique"
    })

    await queryInterface.addIndex("conceptos_remuneracion", ["empresa_id", "codigo"], {
      unique: true,
      where: { empresa_id: { [Sequelize.Op.ne]: null } },
      name: "conceptos_empresa_codigo_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("conceptos_remuneracion")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_conceptos_remuneracion_tipo";')
  }
};
