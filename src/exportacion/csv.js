const SEPARADOR = ";"

function valorCsv(valor) {
    if (valor === null || valor === undefined) {
        return ""
    }

    let texto

    if (valor instanceof Date) {
        texto = valor.toISOString()
    } else if (typeof valor === "object") {
        texto = JSON.stringify(valor)
    } else if (typeof valor === "number") {
        texto = String(valor).replace(".", ",")
    } else {
        texto = String(valor)

        if (/^-?\d+\.\d+$/.test(texto)) {
            texto = texto.replace(".", ",")
        } else if (/^[=+\-@]/.test(texto) && Number.isNaN(Number(texto))) {
            texto = "'" + texto
        }
    }

    if (/[;"\r\n]/.test(texto)) {
        texto = '"' + texto.replaceAll('"', '""') + '"'
    }

    return texto
}

function generarCsv(columnas, filas) {
    const lineas = [columnas.join(SEPARADOR)]

    for (const fila of filas) {
        lineas.push(columnas.map((columna) => valorCsv(fila[columna])).join(SEPARADOR))
    }

    return "\uFEFF" + lineas.join("\r\n")
}

module.exports = { generarCsv }
