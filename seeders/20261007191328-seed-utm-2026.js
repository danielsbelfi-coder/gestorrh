'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", [
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM enero 2026",
        valor: 69751,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: "2026-01-31",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM febrero 2026",
        valor: 69611,
        vigencia_desde: "2026-02-01",
        vigencia_hasta: "2026-02-28",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },      
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM marzo 2026",
        valor: 69889,
        vigencia_desde: "2026-03-01",
        vigencia_hasta: "2026-03-31",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM abril 2026",
        valor: 69889,
        vigencia_desde: "2026-04-01",
        vigencia_hasta: "2026-04-30",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM mayo 2026",
        valor: 70588,
        vigencia_desde: "2026-05-01",
        vigencia_hasta: "2026-05-31",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM junio 2026",
        valor: 71506,
        vigencia_desde: "2026-06-01",
        vigencia_hasta: "2026-06-30",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM julio 2026",
        valor: 71649,
        vigencia_desde: "2026-07-01",
        vigencia_hasta: "2026-07-31",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM agosto 2026",
        valor: 71649,
        vigencia_desde: "2026-08-01",
        vigencia_hasta: "2026-08-31",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM septiembre 2026",
        valor: 71721,
        vigencia_desde: "2026-09-01",
        vigencia_hasta: "2026-09-30",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UTM",
        nombre: "Unidad tributaria mensual",
        tipo: "monto",
        descripcion: "valor UTM octubre 2026",
        valor: 72151,
        vigencia_desde: "2026-10-01",
        vigencia_hasta: "2026-10-31",
        fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", 
      {codigo: "UTM"}
    )
  }
};
