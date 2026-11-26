'use strict';

// Paquete AF: siete domingos adicionales al año del art. 38 bis (solo N° 7 del art. 38).
// - contratos_trabajo.domingos_38bis_anio: «contrato» (cada año de vigencia desde la fecha de ingreso, la regla general)
//   o «calendario» (si las partes lo acordaron, sin reducir el mínimo legal).
// - contratos_trabajo.pacto_sabados_38bis: acuerdo escrito para cambiar hasta 3 de los 7 domingos por sábados, cada uno
//   junto a un domingo de descanso.
// - Marca «sabado_38bis»: sábado de trabajo que se da libre en reemplazo de un domingo del 38 bis.
// - finiquitos.monto_domingos_38bis: al término sin completar la anualidad, los domingos no otorgados se pagan
//   (Ord. DT N° 806/14 de 09-02-2018): criterio de Daniel, 7 menos los ya dados, a un día de sueldo cada uno.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("contratos_trabajo", "domingos_38bis_anio", { type: Sequelize.ENUM("contrato", "calendario"), allowNull: false, defaultValue: "contrato" })
    await queryInterface.addColumn("contratos_trabajo", "pacto_sabados_38bis", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    await queryInterface.sequelize.query(`ALTER TYPE "enum_asistencias_tipo" ADD VALUE IF NOT EXISTS 'sabado_38bis'`)
    await queryInterface.addColumn("finiquitos", "monto_domingos_38bis", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("finiquitos", "monto_domingos_38bis")
    // El valor del tipo no se puede quitar: los sábados del 38 bis quedan como permiso con goce.
    await queryInterface.sequelize.query(`UPDATE asistencias SET tipo = 'permiso_con_goce' WHERE tipo = 'sabado_38bis'`)
    await queryInterface.removeColumn("contratos_trabajo", "pacto_sabados_38bis")
    await queryInterface.removeColumn("contratos_trabajo", "domingos_38bis_anio")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_contratos_trabajo_domingos_38bis_anio"`)
  }
};
