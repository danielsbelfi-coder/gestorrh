// Carga masiva de variables del mes desde una planilla (funciones puras). Ver «Paquete Q» en el SPEC.
// La planilla tiene una fila de encabezado y una fila por trabajador. El sistema reconoce por el título:
// - «RUT» (con DV, o el DV en otra columna «DV»), obligatoria;
// - una columna por concepto, con su nombre o su código (por ejemplo «Anticipo», «Viático», «BONO_PRODUCCION»);
//   no importan mayúsculas, tildes, espacios ni el plural;
// - «Glosa», opcional, para todas las variables de esa fila.
// Las demás columnas (por ejemplo «Nombre») se ignoran y se informan. Una celda vacía o en 0 no carga nada.
const { rutEsValido, calcularDv } = require("../shared/rut.js")

const MAXIMO_FILAS = 2000

// «Viáticos » → «viatico»; «BONO_PRODUCCION» → «bonoproduccion».
function clave(texto) {
    const base = String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
    return base
}

// Variantes de una clave para tolerar el plural (anticipos, viaticos, bonos de produccion…).
function variantes(k) {
    const salida = new Set([k])
    if (k.endsWith("es")) {
        salida.add(k.slice(0, -2))
    }
    if (k.endsWith("s")) {
        salida.add(k.slice(0, -1))
    }
    return [...salida]
}

const TITULOS_RUT = new Set(["rut", "run", "ruttrabajador", "rutdeltrabajador", "rutsindv"])
const TITULOS_DV = new Set(["dv", "digitoverificador"])
const TITULOS_GLOSA = new Set(["glosa", "detalle", "observacion", "observaciones"])

// Lee el encabezado. conceptos: los importables ({ id, codigo, nombre, tipo }).
function columnasDeEncabezado(encabezado, conceptos) {
    const porClave = new Map()
    for (const c of conceptos) {
        porClave.set(clave(c.codigo), c)
        porClave.set(clave(c.nombre), c)
    }
    const columnas = { rut: null, dv: null, glosa: null, conceptos: [], ignoradas: [] }
    const errores = []
    const usados = new Map()

    encabezado.forEach((titulo, indice) => {
        const k = clave(titulo)
        if (k === "") {
            return
        }
        if (TITULOS_RUT.has(k) && columnas.rut === null) {
            columnas.rut = indice
            return
        }
        if (TITULOS_DV.has(k) && columnas.dv === null) {
            columnas.dv = indice
            return
        }
        if (TITULOS_GLOSA.has(k) && columnas.glosa === null) {
            columnas.glosa = indice
            return
        }
        const concepto = variantes(k).map((v) => porClave.get(v)).find(Boolean)
        if (!concepto) {
            columnas.ignoradas.push(String(titulo).trim())
            return
        }
        if (usados.has(concepto.id)) {
            errores.push(`Las columnas «${usados.get(concepto.id)}» y «${String(titulo).trim()}» son el mismo concepto (${concepto.nombre}): deja una sola`)
            return
        }
        usados.set(concepto.id, String(titulo).trim())
        columnas.conceptos.push({ indice, titulo: String(titulo).trim(), concepto })
    })

    if (columnas.rut === null) {
        errores.push("Falta la columna «RUT»")
    }
    if (columnas.conceptos.length === 0) {
        errores.push("Ninguna columna corresponde a un concepto de variable (por ejemplo «Anticipo», «Viático» o «Bono de producción»)")
    }
    return { columnas, errores }
}

// «12.345.678-5», «12345678-5», «123456785» o el cuerpo con el DV aparte. Devuelve { rut, dv } o { error }.
function leerRut(texto, textoDv) {
    const limpio = String(texto ?? "").replace(/[.\s]/g, "").toUpperCase()
    if (limpio === "") {
        return { error: "RUT vacío" }
    }
    let cuerpo
    let dv
    if (textoDv !== undefined && textoDv !== null && String(textoDv).trim() !== "" && !limpio.includes("-")) {
        cuerpo = limpio
        dv = String(textoDv).trim().toUpperCase()
    } else if (limpio.includes("-")) {
        [cuerpo, dv] = limpio.split("-")
    } else {
        cuerpo = limpio.slice(0, -1)
        dv = limpio.slice(-1)
    }
    if (!rutEsValido(cuerpo, dv)) {
        return { error: `RUT ${texto} no válido${/^\d{7,8}$/.test(cuerpo) ? ` (el DV debería ser ${calcularDv(cuerpo)})` : ""}` }
    }
    return { rut: cuerpo, dv }
}

// Monto en pesos: «50000», «50.000», «$ 50.000», «50000,00». Vacío o 0 → null (no carga). Devuelve { monto } o { error }.
function leerMonto(texto) {
    let limpio = String(texto ?? "").replace(/[$\s]/g, "")
    if (limpio === "" || limpio === "-") {
        return { monto: null }
    }
    // Coma decimal (formato chileno): los puntos son de miles.
    if (limpio.includes(",")) {
        limpio = limpio.replace(/\./g, "").replace(",", ".")
    } else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
        limpio = limpio.replace(/\./g, "")
    }
    const numero = Number(limpio)
    if (!Number.isFinite(numero) || numero < 0) {
        return { error: `monto «${texto}» no válido` }
    }
    if (!Number.isInteger(numero)) {
        return { error: `monto «${texto}» con decimales: los montos van en pesos enteros` }
    }
    return { monto: numero === 0 ? null : numero }
}

// matriz: filas de textos, la primera es el encabezado. relacionesPorRut: rut → relaciones con liquidación en el mes
// ({ id, nombre, fecha_ingreso }), de la más reciente a la más antigua. existentes: «trabajadorId-conceptoId» que ya
// tienen variable en el mes. Devuelve { columnas, errores, avisos, variables, filas }.
function revisarPlanilla({ matriz, conceptos, relacionesPorRut, existentes = new Set() }) {
    const resultado = { columnas: null, errores: [], erroresEncabezado: [], avisos: [], variables: [], filas: 0 }
    if (!Array.isArray(matriz) || matriz.length < 2) {
        resultado.erroresEncabezado.push("La planilla no tiene filas de datos (la primera fila es el encabezado)")
        return resultado
    }
    if (matriz.length - 1 > MAXIMO_FILAS) {
        resultado.erroresEncabezado.push(`La planilla no puede tener más de ${MAXIMO_FILAS} filas`)
        return resultado
    }
    const { columnas, errores } = columnasDeEncabezado(matriz[0], conceptos)
    resultado.columnas = columnas
    if (errores.length > 0) {
        resultado.erroresEncabezado.push(...errores)
        return resultado
    }

    const vistos = new Map()
    matriz.slice(1).forEach((fila, i) => {
        const numero = i + 2
        const textoRut = fila[columnas.rut] ?? ""
        const valores = columnas.conceptos.map((c) => ({ ...c, lectura: leerMonto(fila[c.indice]) }))
        const conMonto = valores.filter((v) => v.lectura.monto)
        const conError = valores.filter((v) => v.lectura.error)
        if (String(textoRut).trim() === "" && conMonto.length === 0 && conError.length === 0) {
            return
        }
        resultado.filas++
        const motivos = conError.map((v) => `${v.titulo}: ${v.lectura.error}`)
        const rut = leerRut(textoRut, columnas.dv !== null ? fila[columnas.dv] : undefined)
        let relacion = null
        if (rut.error) {
            motivos.unshift(rut.error)
        } else {
            const relaciones = relacionesPorRut.get(rut.rut) ?? []
            if (relaciones.length === 0) {
                motivos.unshift(`RUT ${rut.rut}-${rut.dv}: no tiene relación laboral en el mes del periodo`)
            } else {
                relacion = relaciones[0]
                if (relaciones.length > 1) {
                    resultado.avisos.push(`Fila ${numero}: ${relacion.nombre} tiene dos relaciones en el mes; se carga en la que empezó el ${relacion.fecha_ingreso.split("-").reverse().join("-")}`)
                }
            }
        }
        if (motivos.length > 0) {
            resultado.errores.push({ fila: numero, rut: String(textoRut), motivos })
            return
        }
        if (vistos.has(relacion.id)) {
            resultado.avisos.push(`Fila ${numero}: ${relacion.nombre} ya estaba en la fila ${vistos.get(relacion.id)}; se cargan las dos`)
        } else {
            vistos.set(relacion.id, numero)
        }
        const glosa = columnas.glosa !== null && String(fila[columnas.glosa] ?? "").trim() !== "" ? String(fila[columnas.glosa]).trim().slice(0, 255) : null
        for (const v of conMonto) {
            if (existentes.has(`${relacion.id}-${v.concepto.id}`)) {
                resultado.avisos.push(`Fila ${numero}: ${relacion.nombre} ya tiene ${v.concepto.nombre} en el mes; se agrega otra`)
            }
            resultado.variables.push({ fila: numero, trabajador_id: relacion.id, nombre: relacion.nombre, concepto_id: v.concepto.id, concepto: v.concepto.nombre, tipo: v.concepto.tipo, monto: v.lectura.monto, glosa })
        }
    })
    return resultado
}

module.exports = { revisarPlanilla, columnasDeEncabezado, leerRut, leerMonto, clave, MAXIMO_FILAS }
