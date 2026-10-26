const fs = require("fs")
const PDFDocument = require("pdfkit")
const { sequelize } = require("../src/shared/database.js")
const { obtenerLiquidacionCompleta } = require("../src/remuneraciones/documento_liquidacion.service.js")
const { armarDocumento } = require("../src/remuneraciones/armar_documento.js")
const { dibujarLiquidacion, TAMANO_PAGINA } = require("../src/remuneraciones/dibujar_liquidacion.js")

async function main() {
    const { liquidacion, cargo } = await obtenerLiquidacionCompleta(31)
    const datos = armarDocumento(liquidacion.toJSON(), cargo)

    const doc = new PDFDocument({ size: TAMANO_PAGINA, margin: 40 })
    doc.pipe(fs.createWriteStream("prueba-liquidacion.pdf"))
    dibujarLiquidacion(doc, datos, { conAportes: true })
    doc.end()

    await sequelize.close()
    console.log("Listo: prueba-liquidacion.pdf")
}

main()