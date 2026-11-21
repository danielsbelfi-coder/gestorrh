'use strict';

// Paquete V: jornada del art. 25 (choferes y auxiliares de la locomoción colectiva interurbana), tipos de espera
// configurables por empresa y registro de turnos de conducción con sus esperas y descansos. Ver «Paquete V» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_jornadas_tipo" ADD VALUE IF NOT EXISTS 'art25'`)
    // Jornada art. 25: tope mensual de horas (180 hasta el 25-04-2028).
    await queryInterface.addColumn("jornadas", "horas_mensuales", { type: Sequelize.DECIMAL(6, 2), allowNull: true })

    await queryInterface.createTable("tipos_espera", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      empresa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "empresas", key: "id" }, onDelete: "CASCADE" },
      nombre: { type: Sequelize.STRING(80), allowNull: false },
      // terminal, cruce, aduana, mantencion, retraso_operativo, descanso_bordo, descanso_tierra, otro
      clase: { type: Sequelize.STRING(30), allowNull: false },
      // Imputable: el tiempo es jornada (a disposición o con labor). No imputable: no es jornada y se trata según el pago.
      imputable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      // no: solo se registra · por_hora: valor × horas pagables · monto_fijo: valor por cada espera con minutos pagables
      pago: { type: Sequelize.ENUM("no", "por_hora", "monto_fijo"), allowNull: false, defaultValue: "no" },
      valor: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      minutos_sin_pago: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      redondeo_minutos: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 1 },
      // dinero: se paga · descanso: no se paga, se acumula como tiempo compensatorio
      compensacion: { type: Sequelize.ENUM("dinero", "descanso"), allowNull: false, defaultValue: "dinero" },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("tipos_espera", ["empresa_id", "nombre"], { unique: true, name: "tipos_espera_empresa_nombre_unique" })

    await queryInterface.createTable("turnos_conduccion", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "trabajadores", key: "id" }, onDelete: "CASCADE" },
      // Día en que empieza el turno: todo el turno se imputa a esa fecha, aunque cruce la medianoche.
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      // Marcaciones de inicio y fin (una hora de fin igual o anterior a la de inicio es del día siguiente).
      hora_inicio: { type: Sequelize.STRING(5), allowNull: false },
      hora_fin: { type: Sequelize.STRING(5), allowNull: false },
      servicio: { type: Sequelize.STRING(120), allowNull: true },
      // Esperas y descansos: [{ tipo_espera_id, inicio, fin, lugar, causa }]
      pausas: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      fuente: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "manual" },
      observaciones: { type: Sequelize.STRING(300), allowNull: true },
      estado_aprobacion: { type: Sequelize.ENUM("pendiente", "aprobado"), allowNull: false, defaultValue: "pendiente" },
      usuario_registro_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" } },
      aprobado_por_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" } },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("turnos_conduccion", ["trabajador_id", "fecha"], { name: "turnos_conduccion_trabajador_fecha" })
  },

  async down(queryInterface) {
    await queryInterface.dropTable("turnos_conduccion")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_turnos_conduccion_estado_aprobacion"`)
    await queryInterface.dropTable("tipos_espera")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_tipos_espera_pago"`)
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_tipos_espera_compensacion"`)
    await queryInterface.removeColumn("jornadas", "horas_mensuales")
  }
};
