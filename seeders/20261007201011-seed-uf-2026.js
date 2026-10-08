'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", [
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 39706.07,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: "2026-01-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 39790.63,
        vigencia_desde: "2026-02-01",
        vigencia_hasta: "2026-02-28",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 39841.72,
        vigencia_desde: "2026-03-01",
        vigencia_hasta: "2026-03-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 40120.20,
        vigencia_desde: "2026-04-01",
        vigencia_hasta: "2026-04-30",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 40610.69,
        vigencia_desde: "2026-05-01",
        vigencia_hasta: "2026-05-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 40820.31,
        vigencia_desde: "2026-06-01",
        vigencia_hasta: "2026-06-30",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 40844.79,
        vigencia_desde: "2026-07-01",
        vigencia_hasta: "2026-07-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 40873.77,
        vigencia_desde: "2026-08-01",
        vigencia_hasta: "2026-08-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento",
        tipo: "monto",
        descripcion: "UF último día del mes",
        valor: 41057.20,
        vigencia_desde: "2026-09-01",
        vigencia_hasta: "2026-09-30",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales",
      { codigo: "UF" }
    )
    
  }
};
