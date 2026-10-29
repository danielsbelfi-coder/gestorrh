'use strict';

// Administrador principal de cada cuenta: el que crea el comercial al dar de alta la cuenta.
// Los demás administradores no pueden cambiar su contraseña, su correo, quitarle el permiso ni desactivarlo; solo soporte.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("usuarios", "es_admin_principal", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    // Cuentas existentes: el principal es el administrador más antiguo de cada cuenta.
    await queryInterface.sequelize.query(`
      UPDATE usuarios SET es_admin_principal = true
      WHERE id IN (
        SELECT MIN(id) FROM usuarios
        WHERE cuenta_id IS NOT NULL AND es_admin_cuenta = true
        GROUP BY cuenta_id
      )
    `)

    // Un solo principal por cuenta.
    await queryInterface.addIndex("usuarios", ["cuenta_id"], {
      name: "usuarios_un_admin_principal_por_cuenta",
      unique: true,
      where: { es_admin_principal: true }
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("usuarios", "usuarios_un_admin_principal_por_cuenta")
    await queryInterface.removeColumn("usuarios", "es_admin_principal")
  }
};
