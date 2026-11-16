'use strict';

// Funciones del contrato opcionales (corrección tras la prueba 1, paquete C3): si quedan vacías, el contrato indica solo
// el cargo (el art. 10 del Código del Trabajo exige la naturaleza de los servicios, y el cargo la cumple).
// Los contratos existentes no cambian.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("contratos_trabajo", "funciones", { type: Sequelize.TEXT, allowNull: true })
  },

  async down(queryInterface, Sequelize) {
    // Para volver a exigirlas, los contratos sin funciones quedan con el texto «Las propias del cargo».
    await queryInterface.sequelize.query("UPDATE contratos_trabajo SET funciones = 'Las propias del cargo' WHERE funciones IS NULL")
    await queryInterface.changeColumn("contratos_trabajo", "funciones", { type: Sequelize.TEXT, allowNull: false })
  }
};
