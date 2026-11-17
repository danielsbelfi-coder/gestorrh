// Casa matriz y sucursales (funciones puras). Ver «Casa matriz y sucursales» en el SPEC.
// La casa matriz es la dirección y comuna de la empresa; las sucursales son filas aparte. El contrato copia el lugar
// y la comuna de la que elige (un contrato firmado no cambia si después se corrige la dirección de la sucursal).
const { COMUNAS } = require("../shared/comunas_lre.js")

// El lugar del contrato es «nombre, dirección» y cabe en 255 caracteres (100 + 2 + 150).
const LARGO_DIRECCION = 150
const LARGO_LUGAR = 255

const texto = (valor) => (typeof valor === "string" ? valor.trim() : "")

// Valida los datos de una sucursal. Solo revisa los campos que vienen (sirve para crear y para editar).
function validarSucursal(entrada, { crear = false } = {}) {
    const datos = {}
    const errores = []

    if (crear || "nombre" in entrada) {
        datos.nombre = texto(entrada.nombre)
        if (datos.nombre.length < 2 || datos.nombre.length > 100) {
            errores.push("El nombre de la sucursal debe tener entre 2 y 100 caracteres")
        }
    }
    if (crear || "direccion" in entrada) {
        datos.direccion = texto(entrada.direccion)
        if (datos.direccion.length < 3 || datos.direccion.length > LARGO_DIRECCION) {
            errores.push(`La dirección de la sucursal debe tener entre 3 y ${LARGO_DIRECCION} caracteres`)
        }
    }
    if (crear || "comuna" in entrada) {
        datos.comuna = entrada.comuna === null || entrada.comuna === undefined ? "" : String(entrada.comuna)
        if (COMUNAS[datos.comuna] === undefined) {
            errores.push("Indica la comuna de la sucursal (tabla de la Dirección del Trabajo)")
        }
    }
    if ("activo" in entrada) {
        if (typeof entrada.activo !== "boolean") {
            errores.push("El estado de la sucursal debe ser activo o inactivo")
        }
        datos.activo = entrada.activo
    }

    return { datos, errores }
}

// Lugar de prestación que queda en el contrato al elegir una sucursal.
function lugarDeSucursal(sucursal) {
    return {
        sucursal_id: sucursal.id,
        lugar_prestacion_servicios: `${sucursal.nombre}, ${sucursal.direccion}`,
        comuna_prestacion: sucursal.comuna
    }
}

const PREFIJO_CASA_MATRIZ = "Casa matriz, "

// Lugar de prestación en la casa matriz (dirección y comuna de la empresa). Sin comuna no sirve para el LRE.
function lugarDeCasaMatriz(empresa) {
    if (!empresa.comuna) {
        return { error: "La casa matriz no tiene comuna: complétala en la ficha de la empresa" }
    }
    const lugar = `${PREFIJO_CASA_MATRIZ}${empresa.direccion}`
    if (lugar.length > LARGO_LUGAR) {
        return { error: "La dirección de la casa matriz es demasiado larga para el contrato: escribe el lugar a mano" }
    }
    return {
        sucursal_id: null,
        lugar_prestacion_servicios: lugar,
        comuna_prestacion: empresa.comuna
    }
}

module.exports = { validarSucursal, lugarDeSucursal, lugarDeCasaMatriz, PREFIJO_CASA_MATRIZ }
