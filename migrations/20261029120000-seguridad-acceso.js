'use strict';

// Seguridad de acceso (S2): sesiones guardadas en el servidor, verificación en dos pasos (TOTP)
// y códigos de recuperación. Ver la sección "Seguridad de acceso" del SPEC.
//
// Las sesiones y los códigos se borran junto con el usuario (CASCADE): no tienen valor sin él.
// "password_cambiado_en" NO se borra aquí: el código actual todavía la usa. Se quita en S3,
// cuando las sesiones reemplacen al JWT.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sesiones", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      // SHA-256 en hexadecimal del identificador que lleva la cookie (el identificador nunca se guarda).
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      csrf_token: { type: Sequelize.STRING(64), allowNull: false },
      estado: { type: Sequelize.ENUM("pendiente_2fa", "activa"), allowNull: false },
      expira_en: { type: Sequelize.DATE, allowNull: false },
      ultimo_uso_en: { type: Sequelize.DATE, allowNull: false },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      navegador: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("sesiones", ["usuario_id"])
    await queryInterface.addIndex("sesiones", ["expira_en"])

    await queryInterface.createTable("codigos_recuperacion", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      codigo_hash: { type: Sequelize.STRING(64), allowNull: false },
      usado_en: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("codigos_recuperacion", ["usuario_id"])

    // Secreto del 2FA cifrado (AES-256-GCM, ver src/auth/cifrado.js). Mientras totp_activo sea false,
    // es una inscripción a medio camino (se generó el QR pero no se confirmó el primer código).
    await queryInterface.addColumn("usuarios", "totp_secreto_cifrado", { type: Sequelize.TEXT, allowNull: true })
    await queryInterface.addColumn("usuarios", "totp_activo", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    await queryInterface.addColumn("usuarios", "totp_activado_en", { type: Sequelize.DATE, allowNull: true })
    // Último intervalo de 30 s usado: impide que el mismo código sirva dos veces.
    await queryInterface.addColumn("usuarios", "totp_ultimo_paso", { type: Sequelize.BIGINT, allowNull: true })

    // Restablecer el acceso = contraseña nueva + 2FA desactivado + sesiones cerradas.
    // Se conserva "restablecer_password" para el historial.
    await queryInterface.sequelize.query(`ALTER TYPE "enum_registro_soporte_tipo" ADD VALUE IF NOT EXISTS 'restablecer_acceso'`)
  },

  async down(queryInterface) {
    // El valor 'restablecer_acceso' del enum no se quita: PostgreSQL no permite borrar valores de un enum.
    await queryInterface.removeColumn("usuarios", "totp_ultimo_paso")
    await queryInterface.removeColumn("usuarios", "totp_activado_en")
    await queryInterface.removeColumn("usuarios", "totp_activo")
    await queryInterface.removeColumn("usuarios", "totp_secreto_cifrado")
    await queryInterface.dropTable("codigos_recuperacion")
    await queryInterface.dropTable("sesiones")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sesiones_estado"')
  }
};
