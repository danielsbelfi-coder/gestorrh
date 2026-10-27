const fs = require("node:fs")
const path = require("node:path")

const RUTA_PLANTILLA = path.join(__dirname, "plantilla_lre.csv")

function columnasLre() {
    const encabezado = fs.readFileSync(RUTA_PLANTILLA, "latin1").split(/\r?\n/)[0]

    return encabezado.split(";").map((nombre) => ({
        nombre,
        codigo: Number(nombre.match(/\((\d+)\)\s*$/)[1])
    }))
}

function encabezadoLre(columnas) {
    return columnas.map((columna) => columna.nombre).join(";")
}

function lineaLre(columnas, valores) {
    return columnas.map((columna) => valores[columna.codigo] ?? "").join(";")
}

module.exports = { columnasLre, encabezadoLre, lineaLre }