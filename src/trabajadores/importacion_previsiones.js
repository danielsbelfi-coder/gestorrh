// Paquete AH: carga masiva de cambios de previsión de personas ya registradas (función pura, sin base de datos).
// Cada fila registra un cambio en el historial de previsión desde un mes, igual que «Registrar cambio» en la ficha.
// Lo que se deja vacío se mantiene como regía ese mes: solo la AFP o la ex-caja (cambia la pensión y se mantiene la
// salud) o solo la salud (se mantiene la pensión). Si una sola fila tiene errores, no se carga nada.

const { limpiarRut } = require("../shared/rut.js")
const { normalizar, resolverCatalogo, leerSiNo, MAXIMO_FILAS } = require("./importacion_personas.js")
const { nombreExCaja, resolverExCaja } = require("./ex_caja_texto.js")
const { nombresDelCatalogo } = require("../shared/nombres_catalogo.js")
const { DESDE_SIEMPRE, previsionDelMes, validarPrevision, normalizarPrevision } = require("./prevision_del_mes.js")

const COLUMNAS = ["rut", "dv", "desde", "afp", "ex_caja", "cotiza_desahucio", "sistema_salud", "isapre", "plan_isapre_uf"]

// [columna, obligatoria, cómo se llena]
const AYUDA_COLUMNAS = [
    ["rut", "sí", "RUT de una persona ya registrada en la empresa, sin dígito verificador (con o sin puntos)."],
    ["dv", "sí", "Dígito verificador del RUT (0-9 o K)."],
    ["desde", "sí", "Mes desde el que rige el cambio: mm-aaaa (03-2027) o aaaa-mm. «siempre» corrige la previsión inicial. No puede alcanzar meses cerrados."],
    ["afp", "no", "Nueva AFP (Habitat, ProVida…). Vacía junto con ex_caja = se mantiene la que regía ese mes."],
    ["ex_caja", "no", "Solo caja antigua (IPS, ex INP): la ex-caja y régimen (Empart régimen 1) o su código Previred de 4 dígitos. Con ex-caja, afp va vacía."],
    ["cotiza_desahucio", "no", "Solo con ex_caja: sí o no (vacío = sí, si su régimen tiene desahucio)."],
    ["sistema_salud", "no", "Fonasa o Isapre. Vacío = se mantiene la salud que regía ese mes (y se ignoran isapre y plan)."],
    ["isapre", "si es Isapre", "Una isapre de la hoja Valores válidos (Colmena, Mas Vida)."],
    ["plan_isapre_uf", "si es Isapre", "Valor del plan en UF (por ejemplo 3,5)."]
]

function texto(valor) {
    return String(valor ?? "").trim()
}

// «03-2027», «3/2027», «2027-03», una fecha dd-mm-aaaa (Excel suele convertir el mes en fecha) o «siempre».
// Devuelve "AAAA-MM", "siempre" o null.
function leerMes(valor) {
    const t = texto(valor)
    if (normalizar(t) === "siempre") {
        return "siempre"
    }
    let anio = null
    let mes = null
    let m
    if ((m = t.match(/^(\d{4})[-/](\d{1,2})$/))) {
        [anio, mes] = [m[1], m[2]]
    } else if ((m = t.match(/^(\d{1,2})[-/](\d{4})$/))) {
        [anio, mes] = [m[2], m[1]]
    } else if ((m = t.match(/^\d{1,2}[-/](\d{1,2})[-/](\d{4})$/))) {
        [anio, mes] = [m[2], m[1]]
    } else if ((m = t.match(/^(\d{4})-(\d{1,2})-\d{1,2}$/))) {
        [anio, mes] = [m[1], m[2]]
    }
    return mes !== null && Number(mes) >= 1 && Number(mes) <= 12 ? `${anio}-${String(Number(mes)).padStart(2, "0")}` : null
}

// La previsión que regía ese mes (o la inicial, para «siempre»), con los cambios de filas anteriores de la planilla.
function previsionQueRegia(historial, desde) {
    if (desde === "siempre") {
        return historial.find((f) => String(f.desde).slice(0, 10) === DESDE_SIEMPRE) ?? null
    }
    return previsionDelMes(historial, Number(desde.slice(0, 4)), Number(desde.slice(5, 7)))
}

function validarFila(fila, catalogos, persona, historial) {
    const motivos = []
    const vacio = (campo) => texto(fila[campo]) === ""

    const desde = leerMes(fila.desde)
    if (desde === null) {
        motivos.push("desde debe ser un mes: mm-aaaa (por ejemplo 03-2027) o «siempre»")
    }

    // Pensión: AFP, ex-caja o la que regía.
    let pension = null
    if (!vacio("ex_caja")) {
        const exCaja = resolverExCaja(catalogos.exCajas, fila.ex_caja)
        if (!vacio("afp")) {
            motivos.push("un imponente del IPS (ex_caja) no lleva AFP: deja la columna afp vacía")
        }
        const desahucio = vacio("cotiza_desahucio") ? true : leerSiNo(fila.cotiza_desahucio)
        if (desahucio === null) {
            motivos.push("cotiza_desahucio debe ser sí o no")
        }
        if (exCaja.motivo) {
            motivos.push(exCaja.motivo)
        } else {
            pension = { regimen: "IPS", ex_caja_regimen_id: exCaja.item.id, cotiza_desahucio: Boolean(exCaja.item.codigo_desahucio) && desahucio === true, afp_id: null }
        }
    } else {
        if (!vacio("cotiza_desahucio")) {
            motivos.push("cotiza_desahucio solo se llena junto con ex_caja")
        }
        if (!vacio("afp")) {
            const afp = resolverCatalogo(catalogos.afps, fila.afp, "la AFP")
            if (afp.motivo) {
                motivos.push(afp.motivo)
            } else {
                pension = { regimen: "AFP", ex_caja_regimen_id: null, cotiza_desahucio: false, afp_id: afp.id }
            }
        }
    }

    // Salud: la indicada o la que regía.
    let salud = null
    if (!vacio("sistema_salud")) {
        const sistema = { fonasa: "Fonasa", isapre: "Isapre" }[normalizar(fila.sistema_salud)]
        if (sistema === undefined) {
            motivos.push("sistema_salud debe ser Fonasa o Isapre")
        } else if (sistema === "Fonasa") {
            salud = { sistema_salud: "Fonasa", isapre_id: null, plan_isapre_uf: null }
        } else {
            const isapre = vacio("isapre") ? { motivo: "falta la isapre" } : resolverCatalogo(catalogos.isapres, fila.isapre, "la isapre")
            const plan = Number(texto(fila.plan_isapre_uf).replace(",", "."))
            if (isapre.motivo) {
                motivos.push(isapre.motivo)
            }
            if (vacio("plan_isapre_uf") || !Number.isFinite(plan) || plan <= 0) {
                motivos.push("plan_isapre_uf debe ser un número mayor que 0 (en UF)")
            }
            if (!isapre.motivo) {
                salud = { sistema_salud: "Isapre", isapre_id: isapre.id, plan_isapre_uf: plan }
            }
        }
    }

    if (vacio("afp") && vacio("ex_caja") && vacio("sistema_salud")) {
        motivos.push("la fila no cambia nada: indica afp, ex_caja o sistema_salud")
    }
    if (motivos.length > 0 || persona === null) {
        return { motivos, datos: null }
    }

    const regia = previsionQueRegia(historial, desde)
    if ((pension === null || salud === null) && regia === null) {
        return { motivos: ["la persona no tiene previsión registrada para ese mes: indica la pensión y la salud completas"], datos: null }
    }
    const datos = {
        desde,
        ...(pension ?? { regimen: regia.regimen ?? "AFP", ex_caja_regimen_id: regia.ex_caja_regimen_id ?? null, cotiza_desahucio: regia.cotiza_desahucio === true, afp_id: regia.afp_id ?? null }),
        ...(salud ?? { sistema_salud: regia.sistema_salud, isapre_id: regia.isapre_id ?? null, plan_isapre_uf: regia.plan_isapre_uf ?? null })
    }
    // Las mismas reglas que un cambio desde la ficha (por ejemplo, salud sin informar en la previsión que regía).
    const errores = validarPrevision(datos)
    return errores.length > 0 ? { motivos: errores, datos: null } : { motivos: [], datos: normalizarPrevision(datos) }
}

// catalogos: { afps, isapres, exCajas, personas: Map de RUT (sin DV) → { id, dv, nombre, previsiones: [filas del historial] } }
function validarCambiosPrevision(filas, catalogos) {
    const errores = []
    const cambios = []
    const vistos = new Map()
    const historiales = new Map()

    if (filas.length > MAXIMO_FILAS) {
        return { cambios, errores: [{ fila: 0, rut: "", motivos: [`la planilla no puede tener más de ${MAXIMO_FILAS} filas`] }] }
    }

    filas.forEach((fila, indice) => {
        const numeroFila = indice + 2
        const motivos = []
        const rut = limpiarRut(texto(fila.rut))
        const persona = catalogos.personas.get(rut) ?? null
        if (texto(fila.rut) === "" || texto(fila.dv) === "") {
            motivos.push("falta el RUT o el DV")
        } else if (persona === null) {
            motivos.push("no hay una persona con ese RUT en la empresa")
        } else if (String(persona.dv).toUpperCase() !== texto(fila.dv).toUpperCase()) {
            motivos.push("el DV no corresponde al RUT")
        }

        const desde = leerMes(fila.desde)
        if (persona !== null && desde !== null) {
            const clave = `${rut}|${desde}`
            if (vistos.has(clave)) {
                motivos.push(`cambio repetido para el mismo mes (fila ${vistos.get(clave)})`)
            } else {
                vistos.set(clave, numeroFila)
            }
            const desdeFecha = desde === "siempre" ? DESDE_SIEMPRE : `${desde}-01`
            if (desde !== "siempre" && persona.previsiones.some((p) => String(p.desde).slice(0, 10) === desdeFecha)) {
                motivos.push(`ya hay un cambio de previsión desde ${desde.split("-").reverse().join("-")}: elimínalo en la ficha antes de cargar otro`)
            }
        }

        const historial = persona ? (historiales.get(rut) ?? [...persona.previsiones]) : []
        const resultado = validarFila(fila, catalogos, persona, historial)
        motivos.push(...resultado.motivos)

        if (motivos.length > 0) {
            errores.push({ fila: numeroFila, rut: texto(fila.rut), motivos })
            return
        }
        // Las filas siguientes de la misma persona ven este cambio como «lo que regía».
        historiales.set(rut, [...historial.filter((p) => String(p.desde).slice(0, 10) !== resultado.datos.desde), resultado.datos])
        cambios.push({ fila: numeroFila, persona_id: persona.id, rut: `${rut}-${persona.dv}`, nombre: persona.nombre, datos: resultado.datos })
    })

    return { cambios, errores }
}

function valoresValidos(catalogos) {
    return [
        { columna: "afp", valores: nombresDelCatalogo(catalogos.afps) },
        { columna: "ex_caja", valores: catalogos.exCajas.map(nombreExCaja) },
        { columna: "cotiza_desahucio", valores: ["sí", "no"] },
        { columna: "sistema_salud", valores: ["Fonasa", "Isapre"] },
        { columna: "isapre", valores: nombresDelCatalogo(catalogos.isapres) }
    ]
}

module.exports = { COLUMNAS, AYUDA_COLUMNAS, leerMes, validarCambiosPrevision, valoresValidos }
