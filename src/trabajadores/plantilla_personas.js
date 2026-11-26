// Plantilla de la inscripción masiva: un .xlsx con la hoja «Personas» (los títulos de las columnas, con listas
// desplegables en las que tienen valores fijos), la hoja «Valores válidos» y la hoja «Cómo llenar».
// Para subirla, se guarda la hoja «Personas» como CSV (Excel: Guardar como → CSV UTF-8).

const { COLUMNAS, MAXIMO_FILAS, valoresValidos } = require("./importacion_personas.js")
const { crearXlsx, letraDeColumna } = require("../shared/xlsx_minimo.js")

const HOJA_VALORES = "Valores válidos"

// [columna, obligatoria, cómo se llena]
const AYUDA_COLUMNAS = [
    ["rut", "sí", "RUT sin dígito verificador, con o sin puntos (12.345.678)."],
    ["dv", "sí", "Dígito verificador del RUT (0-9 o K)."],
    ["nombres", "sí", "Nombres de la persona."],
    ["apellido_paterno", "sí", "Apellido paterno."],
    ["apellido_materno", "no", "Apellido materno."],
    ["nacionalidad", "sí", "chilena o extranjera."],
    ["fecha_nacimiento", "sí", "dd-mm-aaaa (por ejemplo 12-05-1990)."],
    ["sexo", "no", "masculino o femenino."],
    ["estado_civil", "no", "Texto libre (soltero, casado…)."],
    ["direccion", "sí", "Domicilio de la persona."],
    ["telefono", "no", "Teléfono de contacto."],
    ["email", "no", "Correo electrónico."],
    ["afp", "no", "Una AFP de la hoja Valores válidos; se acepta sin «AFP» y sin importar mayúsculas ni tildes (Habitat, ProVida, Pro Vida). Vacío si no tiene."],
    ["ex_caja", "solo caja antigua", "Solo para imponentes del IPS (ex INP): la ex-caja y régimen de la hoja Valores válidos (Empart régimen 1) o su código Previred de 4 dígitos. Con ex-caja, la columna afp va vacía."],
    ["cotiza_desahucio", "no", "Solo con ex_caja: sí o no (vacío = sí, si su régimen tiene desahucio)."],
    ["afiliado_afc", "no", "sí o no (vacío = sí)."],
    ["sistema_salud", "no", "Fonasa o Isapre."],
    ["isapre", "si es Isapre", "Una isapre de la hoja Valores válidos; se acepta el nombre corto (Colmena, Mas Vida)."],
    ["plan_isapre_uf", "si es Isapre", "Valor del plan en UF (por ejemplo 3,5)."],
    ["forma_pago", "no", "transferencia, cheque, efectivo o vale vista (vacío = transferencia)."],
    ["banco", "no", "Nombre del banco (BancoEstado, Santander…) o su código de 3 dígitos."],
    ["tipo_cuenta", "no", "corriente, rut, ahorro o vista."],
    ["numero_cuenta", "no", "Número de la cuenta."],
    ["crear_postulante", "no", "sí para crearla también como postulante (vacío = no)."],
    ["fecha_ingreso", "si crea postulante", "dd-mm-aaaa."]
]

// Plantilla genérica: hoja de datos con listas desplegables, «Valores válidos» y «Cómo llenar».
function generarPlantilla({ hoja, columnas, guia, ayuda }) {
    const maximo = Math.max(...guia.map((g) => g.valores.length))

    // Hoja de valores: una columna por campo, con los valores uno bajo otro.
    const filasValores = [guia.map((g) => g.columna)]
    for (let i = 0; i < maximo; i++) {
        filasValores.push(guia.map((g) => g.valores[i] ?? ""))
    }

    // Lista desplegable en la hoja de datos para cada columna con valores fijos.
    const validaciones = guia.map((g, indice) => {
        const columnaDatos = letraDeColumna(columnas.indexOf(g.columna))
        const columnaValores = letraDeColumna(indice)
        return {
            rango: `${columnaDatos}2:${columnaDatos}${MAXIMO_FILAS + 1}`,
            formula: `'${HOJA_VALORES}'!$${columnaValores}$2:$${columnaValores}$${g.valores.length + 1}`
        }
    })

    return crearXlsx([
        { nombre: hoja, filas: [columnas], anchos: columnas.map((c) => Math.max(14, c.length + 4)), validaciones },
        { nombre: HOJA_VALORES, filas: filasValores, anchos: guia.map((g) => Math.max(18, g.columna.length + 4, ...g.valores.map((v) => v.length + 2))) },
        { nombre: "Cómo llenar", filas: [["columna", "obligatoria", "cómo se llena"], ...ayuda], anchos: [20, 18, 110] }
    ])
}

async function generarPlantillaPersonas(catalogos) {
    return generarPlantilla({ hoja: "Personas", columnas: COLUMNAS, guia: valoresValidos(catalogos), ayuda: AYUDA_COLUMNAS })
}

// Paquete AH: cambios de previsión de personas ya registradas.
async function generarPlantillaPrevisiones(catalogos) {
    const previsiones = require("./importacion_previsiones.js")
    return generarPlantilla({ hoja: "Previsión", columnas: previsiones.COLUMNAS, guia: previsiones.valoresValidos(catalogos), ayuda: previsiones.AYUDA_COLUMNAS })
}

module.exports = {
    AYUDA_COLUMNAS,
    generarPlantillaPersonas,
    generarPlantillaPrevisiones
}
