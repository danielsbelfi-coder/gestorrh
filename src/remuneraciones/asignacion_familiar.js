// Reglas puras de las cargas familiares y la asignación familiar. Sin base de datos, para poder probarlas.
// Ver «Cargas familiares y asignación familiar» en el SPEC.
const { limpiarRut, rutEsValido } = require("../shared/rut.js")

const TRAMOS = ["A", "B", "C", "D"]
const TIPOS_CARGA = ["simple", "maternal", "invalidez"]
const RELACIONES = ["hijo", "conyuge", "conviviente_civil", "nieto", "madre_viuda", "ascendiente", "propia", "otro"]

const primerDia = (anio, mes) => `${anio}-${String(mes).padStart(2, "0")}-01`

function ultimoDia(anio, mes) {
    const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
    return `${anio}-${String(mes).padStart(2, "0")}-${String(dias).padStart(2, "0")}`
}

const fecha = (valor) => valor === null || valor === undefined ? null : String(valor).slice(0, 10)

// El tramo que rige en un mes: la fila con el mayor "desde" que no pasa el primer día del mes. null si no hay.
function tramoDelMes(filas, anio, mes) {
    const limite = primerDia(anio, mes)
    let elegida = null
    for (const fila of filas ?? []) {
        const desde = fecha(fila.desde)
        if (desde <= limite && (elegida === null || desde > fecha(elegida.desde))) {
            elegida = fila
        }
    }
    return elegida
}

// Las cargas vigentes al menos un día del mes (la asignación se paga por mes completo).
function cargasDelMes(cargas, anio, mes) {
    const inicio = primerDia(anio, mes)
    const fin = ultimoDia(anio, mes)
    return (cargas ?? []).filter((carga) => fecha(carga.desde) <= fin && (carga.hasta === null || carga.hasta === undefined || fecha(carga.hasta) >= inicio))
}

// montos = { A, B, C }: valor unitario por carga. Tramo D (o sin tramo) no paga. La carga por invalidez paga el duplo.
// Devuelve lo que se guarda en la liquidación: { tramo, simples, maternales, invalidez, unitario, monto }.
function calcularAsignacion({ tramo, cargas, montos }) {
    const contar = (tipo) => cargas.filter((carga) => carga.tipo === tipo).length
    const simples = contar("simple")
    const maternales = contar("maternal")
    const invalidez = contar("invalidez")

    if (cargas.length > 0 && !TRAMOS.includes(tramo)) {
        throw new Error("La persona tiene cargas familiares vigentes en el mes, pero no tiene tramo de asignación familiar registrado")
    }

    const unitario = tramo === "A" || tramo === "B" || tramo === "C" ? Number(montos[tramo]) : 0
    if (!Number.isFinite(unitario)) {
        throw new Error(`Falta el monto de la asignación familiar del tramo ${tramo}`)
    }

    return {
        tramo: tramo ?? null,
        simples,
        maternales,
        invalidez,
        unitario,
        monto: unitario * (simples + maternales) + 2 * unitario * invalidez
    }
}

// ---------- Validaciones ----------

// "AAAA-MM-DD" de un día que existe (rechaza, por ejemplo, 2026-02-30).
function esFecha(texto) {
    if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return false
    }
    const dia = new Date(`${texto}T00:00:00Z`)
    return !Number.isNaN(dia.getTime()) && dia.toISOString().slice(0, 10) === texto
}

const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === ""

// "AAAA-MM" → "AAAA-MM-01"; cualquier otra cosa → null.
function desdeDeMes(texto) {
    return typeof texto === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(texto) ? `${texto}-01` : null
}

function validarTramo(datos) {
    const errores = []
    if (desdeDeMes(datos?.desde) === null) {
        errores.push("El mes desde el que rige debe tener el formato AAAA-MM")
    }
    if (!TRAMOS.includes(String(datos?.tramo ?? "").toUpperCase())) {
        errores.push("El tramo debe ser A, B, C o D")
    }
    if (!vacio(datos?.documento) && String(datos.documento).trim().length > 100) {
        errores.push("El documento admite hasta 100 caracteres")
    }
    return errores
}

function normalizarTramo(datos) {
    return {
        desde: desdeDeMes(datos.desde),
        tramo: String(datos.tramo).toUpperCase(),
        documento: vacio(datos.documento) ? null : String(datos.documento).trim()
    }
}

// Revisa los datos de una carga. El RUT es opcional (por ejemplo, la asignación maternal antes del nacimiento).
function validarCarga(datos) {
    const errores = []
    if (vacio(datos?.nombre)) {
        errores.push("Debe indicar el nombre de la carga")
    } else if (String(datos.nombre).trim().length > 120) {
        errores.push("El nombre admite hasta 120 caracteres")
    }
    if (!RELACIONES.includes(datos?.relacion)) {
        errores.push("La relación no es válida")
    }
    if (!TIPOS_CARGA.includes(datos?.tipo)) {
        errores.push("El tipo debe ser simple, maternal o invalidez")
    }
    if (!esFecha(datos?.desde)) {
        errores.push("La fecha desde no es válida")
    }
    if (!vacio(datos?.hasta)) {
        if (!esFecha(datos.hasta)) {
            errores.push("La fecha hasta no es válida")
        } else if (esFecha(datos?.desde) && datos.hasta < datos.desde) {
            errores.push("La fecha hasta no puede ser anterior a la fecha desde")
        }
    }
    if (!vacio(datos?.rut) || !vacio(datos?.dv)) {
        if (!rutEsValido(limpiarRut(datos.rut ?? ""), String(datos.dv ?? "").trim().toUpperCase())) {
            errores.push("El RUT de la carga no es válido")
        }
    }
    if (!vacio(datos?.documento) && String(datos.documento).trim().length > 100) {
        errores.push("El documento admite hasta 100 caracteres")
    }
    return errores
}

function normalizarCarga(datos) {
    const conRut = !vacio(datos.rut)
    return {
        rut: conRut ? limpiarRut(datos.rut) : null,
        dv: conRut ? String(datos.dv).trim().toUpperCase() : null,
        nombre: String(datos.nombre).trim(),
        relacion: datos.relacion,
        tipo: datos.tipo,
        desde: datos.desde,
        hasta: vacio(datos.hasta) ? null : datos.hasta,
        documento: vacio(datos.documento) ? null : String(datos.documento).trim()
    }
}

// Meses "AAAA-MM" cerrados (de liquidaciones de la persona) que caen dentro de [desde, hasta]. hasta null = sin término.
function mesesCerradosEnRango(desde, hasta, mesesCerrados) {
    const desdeMes = String(desde).slice(0, 7)
    const hastaMes = hasta === null || hasta === undefined ? "9999-12" : String(hasta).slice(0, 7)
    return [...new Set(mesesCerrados.map(({ anio, mes }) => `${anio}-${String(mes).padStart(2, "0")}`)
        .filter((mes) => mes >= desdeMes && mes <= hastaMes))].sort()
}

module.exports = {
    TRAMOS,
    TIPOS_CARGA,
    RELACIONES,
    tramoDelMes,
    cargasDelMes,
    calcularAsignacion,
    desdeDeMes,
    validarTramo,
    normalizarTramo,
    validarCarga,
    normalizarCarga,
    mesesCerradosEnRango
}
