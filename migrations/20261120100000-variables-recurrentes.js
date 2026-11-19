'use strict';

// Paquete P: variables permanentes (por ejemplo, colación todos los meses hasta una fecha) y préstamos de la empresa en
// cuotas. Se definen una vez, aprobadas, y el sistema las agrega solas a cada mes abierto como variables aprobadas
// (fuente «recurrente»). Ver «Paquete P» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("variables_recurrentes", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "trabajadores", key: "id" }, onDelete: "CASCADE" },
      concepto_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "conceptos_remuneracion", key: "id" } },
      tipo: { type: Sequelize.ENUM("permanente", "cuotas"), allowNull: false },
      // Permanente: monto de cada mes. Cuotas: monto total del préstamo.
      monto: { type: Sequelize.INTEGER, allowNull: false },
      cuotas: { type: Sequelize.INTEGER, allowNull: true },
      // Permanente: proporcional a los días pagados del mes (ingreso, término, licencia, permiso sin goce).
      proporcional: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      // Primer día del mes desde el que rige y, en la permanente, del último mes (null: hasta el término de la relación).
      desde_mes: { type: Sequelize.DATEONLY, allowNull: false },
      hasta_mes: { type: Sequelize.DATEONLY, allowNull: true },
      glosa: { type: Sequelize.STRING, allowNull: true },
      usuario_creo_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" } },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("variables_recurrentes", ["trabajador_id"], { name: "variables_recurrentes_trabajador" })

    await queryInterface.addColumn("variables_periodo", "recurrente_id", {
      type: Sequelize.INTEGER, allowNull: true, references: { model: "variables_recurrentes", key: "id" }, onDelete: "SET NULL"
    })
    await queryInterface.addColumn("variables_periodo", "numero_cuota", { type: Sequelize.INTEGER, allowNull: true })
    await queryInterface.addColumn("variables_periodo", "proporcional", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    await queryInterface.addIndex("variables_periodo", ["recurrente_id", "periodo_id"], {
      unique: true, name: "variables_periodo_recurrente_periodo", where: { recurrente_id: { [Sequelize.Op.ne]: null } }
    })
    await queryInterface.sequelize.query(`ALTER TYPE "enum_variables_periodo_fuente" ADD VALUE IF NOT EXISTS 'recurrente'`)
  },

  async down(queryInterface) {
    // Las variables ya agregadas por una recurrente quedan como manuales (el valor 'recurrente' del tipo no se puede quitar).
    await queryInterface.sequelize.query(`UPDATE variables_periodo SET fuente = 'manual' WHERE fuente = 'recurrente'`)
    await queryInterface.removeIndex("variables_periodo", "variables_periodo_recurrente_periodo")
    await queryInterface.removeColumn("variables_periodo", "proporcional")
    await queryInterface.removeColumn("variables_periodo", "numero_cuota")
    await queryInterface.removeColumn("variables_periodo", "recurrente_id")
    await queryInterface.dropTable("variables_recurrentes")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_variables_recurrentes_tipo";')
  }
};
