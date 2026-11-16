// Generador mínimo de archivos .xlsx (sin dependencias nuevas: un .xlsx es un zip con XML; el zip lo arma archiver).
// Hojas con texto, encabezado en negrita, primera fila fija, anchos de columna y listas desplegables (validación de datos).
//
// hojas: [{ nombre, filas: [[texto…]…], anchos?: [número…], validaciones?: [{ rango: "H2:H501", formula: "'Hoja'!$A$2:$A$9" }] }]
// La primera fila de cada hoja es el encabezado.

const { ZipArchive } = require("archiver")

function escaparXml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
}

// 0 → A, 25 → Z, 26 → AA
function letraDeColumna(indice) {
    let letra = ""
    let n = indice + 1
    while (n > 0) {
        const resto = (n - 1) % 26
        letra = String.fromCharCode(65 + resto) + letra
        n = Math.floor((n - 1) / 26)
    }
    return letra
}

function xmlDeHoja({ filas, anchos = [], validaciones = [] }) {
    const columnas = anchos.length > 0
        ? `<cols>${anchos.map((ancho, i) => `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`).join("")}</cols>`
        : ""

    const datos = filas.map((fila, i) => {
        const celdas = fila.map((valor, j) => {
            const referencia = `${letraDeColumna(j)}${i + 1}`
            const estilo = i === 0 ? ' s="1"' : ""
            return `<c r="${referencia}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escaparXml(valor ?? "")}</t></is></c>`
        }).join("")
        return `<row r="${i + 1}">${celdas}</row>`
    }).join("")

    const listas = validaciones.length > 0
        ? `<dataValidations count="${validaciones.length}">${validaciones.map(({ rango, formula }) =>
            `<dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="${rango}"><formula1>${escaparXml(formula)}</formula1></dataValidation>`).join("")}</dataValidations>`
        : ""

    // Orden de los elementos exigido por el formato: sheetViews, cols, sheetData, dataValidations.
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        + columnas
        + `<sheetData>${datos}</sheetData>`
        + listas
        + "</worksheet>"
}

const ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + "</styleSheet>"

// Devuelve un Buffer con el archivo .xlsx.
async function crearXlsx(hojas) {
    const zip = new ZipArchive()
    const trozos = []
    zip.on("data", (trozo) => trozos.push(trozo))
    const terminado = new Promise((resolver, rechazar) => {
        zip.on("end", resolver)
        zip.on("error", rechazar)
    })

    const tipos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
        + "</Types>"

    const relacionesRaiz = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + "</Relationships>"

    const libro = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + `<sheets>${hojas.map((hoja, i) => `<sheet name="${escaparXml(hoja.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>`
        + "</workbook>"

    const relacionesLibro = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")
        + `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
        + "</Relationships>"

    zip.append(tipos, { name: "[Content_Types].xml" })
    zip.append(relacionesRaiz, { name: "_rels/.rels" })
    zip.append(libro, { name: "xl/workbook.xml" })
    zip.append(relacionesLibro, { name: "xl/_rels/workbook.xml.rels" })
    zip.append(ESTILOS, { name: "xl/styles.xml" })
    hojas.forEach((hoja, i) => zip.append(xmlDeHoja(hoja), { name: `xl/worksheets/sheet${i + 1}.xml` }))

    await zip.finalize()
    await terminado

    return Buffer.concat(trozos)
}

module.exports = {
    crearXlsx,
    letraDeColumna
}
