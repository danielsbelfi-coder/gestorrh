'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("empresas", "cuenta_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "cuentas", key: "id" }
    })
    await queryInterface.addColumn("empresas", "fecha_desactivacion", {
      type: Sequelize.DATEONLY,
      allowNull: true
    })
    await queryInterface.addColumn("usuarios", "cuenta_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "cuentas", key: "id" }
    })
    await queryInterface.addColumn("usuarios", "es_admin_cuenta", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
    const [filas] = await queryInterface.sequelize.query(`
  INSERT INTO cuentas (nombre, rut_titular, dv_titular, razon_social_titular, email_contacto, "createdAt", "updatedAt")
  VALUES (:nombre, :rut, :dv, :razonSocial, :email, NOW(), NOW())
  RETURNING id
`, {
      replacements: {
        nombre: "Cuenta inicial",
        rut: "11111111",
        dv: "1",
        razonSocial: "Cuenta inicial de pruebas",
        email: "admin@prueba.cl"
      }
    })
    const cuentaId = filas[0].id

    await queryInterface.sequelize.query(`
  UPDATE empresas SET cuenta_id = :cuentaId
`, { replacements: { cuentaId } })
    await queryInterface.sequelize.query(`
      UPDATE usuarios SET cuenta_id = :cuentaId
      WHERE es_soporte_plataforma IS NOT TRUE
    `, { replacements: { cuentaId } })

    await queryInterface.sequelize.query(`
      UPDATE usuarios SET es_admin_cuenta = true
      WHERE email = :email
    `, { replacements: { email: "admin@prueba.cl" } })

    await queryInterface.sequelize.query(`
      UPDATE empresas SET estado = 'activa' WHERE id = 1
    `)

    await queryInterface.changeColumn("empresas", "cuenta_id", {
      type: Sequelize.INTEGER,
      allowNull: false
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE empresas SET estado = 'inactiva' WHERE id = 1
    `)

    await queryInterface.removeColumn("usuarios", "es_admin_cuenta")
    await queryInterface.removeColumn("usuarios", "cuenta_id")
    await queryInterface.removeColumn("empresas", "fecha_desactivacion")
    await queryInterface.removeColumn("empresas", "cuenta_id")

    await queryInterface.sequelize.query(`
      DELETE FROM cuentas WHERE nombre = :nombre
    `, { replacements: { nombre: "Cuenta inicial" } })
  }
};
