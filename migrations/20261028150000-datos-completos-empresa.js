'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("empresas", "tipo_empleador", {
      type: Sequelize.ENUM("juridica", "natural"), allowNull: false, defaultValue: "juridica"
    })
    await queryInterface.addColumn("empresas", "nombres", { type: Sequelize.STRING, allowNull: true })
    await queryInterface.addColumn("empresas", "apellido_paterno", { type: Sequelize.STRING, allowNull: true })
    await queryInterface.addColumn("empresas", "apellido_materno", { type: Sequelize.STRING, allowNull: true })
    await queryInterface.addColumn("empresas", "giro", { type: Sequelize.STRING, allowNull: true })
    await queryInterface.addColumn("empresas", "codigo_actividad", { type: Sequelize.STRING(6), allowNull: true })
    await queryInterface.addColumn("empresas", "telefono", { type: Sequelize.STRING(30), allowNull: true })
    await queryInterface.addColumn("empresas", "email", { type: Sequelize.STRING, allowNull: true })
    await queryInterface.addColumn("empresas", "representante_legal_email", { type: Sequelize.STRING, allowNull: true })
    await queryInterface.addColumn("empresas", "ccaf", { type: Sequelize.STRING(20), allowNull: true })
    await queryInterface.addColumn("empresas", "ccaf_agencia", { type: Sequelize.STRING, allowNull: true })
    await queryInterface.addColumn("empresas", "ccaf_numero_socio", { type: Sequelize.STRING(30), allowNull: true })
  },

  async down(queryInterface) {
    for (const columna of ["ccaf_numero_socio", "ccaf_agencia", "ccaf", "representante_legal_email", "email", "telefono",
      "codigo_actividad", "giro", "apellido_materno", "apellido_paterno", "nombres", "tipo_empleador"]) {
      await queryInterface.removeColumn("empresas", columna)
    }
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_empresas_tipo_empleador";')
  }
};
