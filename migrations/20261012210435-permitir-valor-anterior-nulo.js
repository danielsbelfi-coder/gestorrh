'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("asistencia_correcciones", "valor_anterior", {
      type: Sequelize.STRING,
      allowNull: true
    }
    );

    await queryInterface.changeColumn("contratos_anexo",
      "valor_anterior", {
      type: Sequelize.STRING,
      allowNull: true
    }
    )

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("asistencia_correcciones", "valor_anterior", {
      type: Sequelize.STRING,
      allowNull: false
    })

    await queryInterface.changeColumn("contratos_anexo", "valor_anterior", {
      type: Sequelize.STRING,
      allowNull: false
    })
  }
};
