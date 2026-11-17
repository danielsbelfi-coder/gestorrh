'use strict';

// Paquete D1 (funciones nuevas tras la prueba 1):
// - Sucursales de la empresa (la casa matriz es la dirección y comuna de la empresa). El contrato puede apuntar a una
//   sucursal; el lugar y la comuna de prestación se copian de ella (la comuna llega al LRE, código 1106).
// - Regla de fecha de pago de remuneraciones por empresa: «último día hábil del mes» o «día N del mes siguiente».
// - Valores de los anexos a TEXT: el anexo de sucursal guarda sucursal, lugar y comuna juntos (más de 255 caracteres).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("sucursales", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        empresa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "empresas", key: "id" }, onDelete: "CASCADE" },
        nombre: { type: Sequelize.STRING(100), allowNull: false },
        direccion: { type: Sequelize.STRING, allowNull: false },
        comuna: { type: Sequelize.STRING(5), allowNull: false },
        activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      }, { transaction })
      await queryInterface.addIndex("sucursales", ["empresa_id", "nombre"], { unique: true, name: "sucursales_empresa_nombre", transaction })

      // Una sucursal usada en contratos no se borra: se desactiva.
      await queryInterface.addColumn("contratos_trabajo", "sucursal_id", {
        type: Sequelize.INTEGER, allowNull: true, references: { model: "sucursales", key: "id" }, onDelete: "RESTRICT"
      }, { transaction })

      await queryInterface.addColumn("empresas", "regla_fecha_pago", {
        type: Sequelize.ENUM("ultimo_dia_habil", "dia_mes_siguiente"), allowNull: true
      }, { transaction })
      await queryInterface.addColumn("empresas", "dia_pago", { type: Sequelize.SMALLINT, allowNull: true }, { transaction })

      await queryInterface.changeColumn("contratos_anexo", "valor_anterior", { type: Sequelize.TEXT, allowNull: true }, { transaction })
      await queryInterface.changeColumn("contratos_anexo", "valor_nuevo", { type: Sequelize.TEXT, allowNull: false }, { transaction })
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Los anexos de sucursal no existían antes: se borran para poder volver a 255 caracteres.
      await queryInterface.sequelize.query("DELETE FROM contratos_anexo WHERE campo_modificado = 'sucursal'", { transaction })
      await queryInterface.changeColumn("contratos_anexo", "valor_anterior", { type: Sequelize.STRING, allowNull: true }, { transaction })
      await queryInterface.changeColumn("contratos_anexo", "valor_nuevo", { type: Sequelize.STRING, allowNull: false }, { transaction })

      await queryInterface.removeColumn("empresas", "dia_pago", { transaction })
      await queryInterface.removeColumn("empresas", "regla_fecha_pago", { transaction })
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_empresas_regla_fecha_pago"', { transaction })

      await queryInterface.removeColumn("contratos_trabajo", "sucursal_id", { transaction })
      await queryInterface.dropTable("sucursales", { transaction })
    })
  }
};
