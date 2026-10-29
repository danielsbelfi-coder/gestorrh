'use strict';

// Acceso de soporte autorizado por el cliente y registro de todo lo que soporte consulta.
// Las claves foráneas usan SET NULL: al eliminar una empresa o cuenta el registro se conserva (2 años).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("accesos_soporte", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      cuenta_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "cuentas", key: "id" }, onDelete: "SET NULL" },
      empresa_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "empresas", key: "id" }, onDelete: "SET NULL" },
      autorizado_por_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      desde: { type: Sequelize.DATE, allowNull: false },
      hasta: { type: Sequelize.DATE, allowNull: false },
      revocado_en: { type: Sequelize.DATE, allowNull: true },
      revocado_por_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("accesos_soporte", ["empresa_id", "hasta"])
    await queryInterface.addIndex("accesos_soporte", ["cuenta_id"])

    await queryInterface.createTable("registro_soporte", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      tipo: { type: Sequelize.ENUM("consulta", "restablecer_password"), allowNull: false },
      usuario_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      acceso_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "accesos_soporte", key: "id" }, onDelete: "SET NULL" },
      cuenta_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "cuentas", key: "id" }, onDelete: "SET NULL" },
      empresa_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "empresas", key: "id" }, onDelete: "SET NULL" },
      metodo: { type: Sequelize.STRING(10), allowNull: true },
      ruta: { type: Sequelize.STRING(500), allowNull: true },
      estado_http: { type: Sequelize.INTEGER, allowNull: true },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      detalle: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("registro_soporte", ["cuenta_id", "createdAt"])
    await queryInterface.addIndex("registro_soporte", ["createdAt"])
  },

  async down(queryInterface) {
    await queryInterface.dropTable("registro_soporte")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_registro_soporte_tipo"')
    await queryInterface.dropTable("accesos_soporte")
  }
};
