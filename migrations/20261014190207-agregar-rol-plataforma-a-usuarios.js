'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "rol_plataforma", {
      type: Sequelize.ENUM(
        "soporte",
        "comercial"
      ),
      allowNull: true
    })

    await queryInterface.sequelize.query(`
      UPDATE usuarios SET rol_plataforma = 'soporte'
      WHERE es_soporte_plataforma = true
      `)

    await queryInterface.removeColumn("usuarios", "es_soporte_plataforma")

  },
  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "es_soporte_plataforma", {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    })
    await queryInterface.sequelize.query(`
        UPDATE usuarios SET es_soporte_plataforma =  true
        WHERE rol_plataforma = 'soporte'
        `)
    await queryInterface.removeColumn("usuarios", "rol_plataforma")

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_usuarios_rol_plataforma"')
  }
}

