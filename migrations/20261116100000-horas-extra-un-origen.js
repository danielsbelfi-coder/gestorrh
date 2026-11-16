'use strict';

// Horas extra con un solo origen (corrección tras la prueba 1, paquete A2):
// - Cada marca del libro de asistencia indica si sus horas extra van al 50 % o al 100 % (por defecto 50, como hasta ahora:
//   las marcas existentes no cambian de resultado).
// - La variable de horas extra queda solo para horas pendientes de un mes ya cerrado: guarda el mes de origen.
//   Las variables existentes se conservan tal cual (sin mes de origen). Las de periodos cerrados no se tocan; una manual
//   de un periodo abierto bloquea el cálculo con un mensaje hasta que se le indique el mes de origen o se elimine.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("asistencias", "recargo_hora_extra", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 50 })
    await queryInterface.addConstraint("asistencias", {
      fields: ["recargo_hora_extra"],
      type: "check",
      where: { recargo_hora_extra: [50, 100] },
      name: "asistencias_recargo_hora_extra_50_o_100"
    })
    // Primer día del mes en que se trabajaron las horas (solo variables de horas extra manuales).
    await queryInterface.addColumn("variables_periodo", "mes_origen", { type: Sequelize.DATEONLY, allowNull: true })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("variables_periodo", "mes_origen")
    await queryInterface.removeConstraint("asistencias", "asistencias_recargo_hora_extra_50_o_100")
    await queryInterface.removeColumn("asistencias", "recargo_hora_extra")
  }
};
