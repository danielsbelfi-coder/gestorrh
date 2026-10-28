// Validación y normalización de los datos de una empresa (función pura, sin base de datos).

const { limpiarRut, rutEsValido, formatearRut } = require("../shared/rut.js")
const { COMUNAS } = require("../shared/comunas_lre.js")

// Cajas de compensación vigentes. Por ahora solo se guarda el dato; su efecto en el cálculo y en Previred es un paso aparte.
const CCAF = {
    los_andes: "Caja Los Andes",
    la_araucana: "Caja La Araucana",
    los_heroes: "Caja Los Héroes",
    "18_septiembre": "Caja 18 de Septiembre"
}

const TIPOS_EMPLEADOR = ["juridica", "natural"]

// Campos que se pueden guardar al crear o editar (además de rut, dv y cuenta_id al crear).
const CAMPOS_EMPRESA = [
    "tipo_empleador", "razon_social", "nombre_fantasia", "nombres", "apellido_paterno", "apellido_materno",
    "giro", "codigo_actividad", "direccion", "comuna", "telefono", "email",
    "representante_legal_nombre", "representante_legal_rut", "representante_legal_email",
    "mutualidad_id", "tasa_adicional_mutual", "ccaf", "ccaf_agencia", "ccaf_numero_socio"
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function vacio(valor) {
    return valor === undefined || valor === null || String(valor).trim() === ""
}

// Devuelve { datos, errores }. Solo revisa los campos que vienen (sirve para crear y para editar).
// Los textos vacíos opcionales se guardan como null.
function validarDatosEmpresa(entrada) {
    const datos = { ...entrada }
    const errores = []

    for (const campo of ["nombre_fantasia", "nombres", "apellido_paterno", "apellido_materno", "giro", "codigo_actividad",
        "comuna", "telefono", "email", "representante_legal_email", "ccaf", "ccaf_agencia", "ccaf_numero_socio"]) {
        if (campo in datos) {
            datos[campo] = vacio(datos[campo]) ? null : String(datos[campo]).trim()
        }
    }

    if ("tipo_empleador" in datos && !TIPOS_EMPLEADOR.includes(datos.tipo_empleador)) {
        errores.push("El tipo de empleador debe ser persona jurídica o persona natural")
    }

    // Empleador persona natural: se identifica con su nombre; la razón social es su nombre completo.
    if (datos.tipo_empleador === "natural") {
        if (vacio(datos.nombres) || vacio(datos.apellido_paterno)) {
            errores.push("Si el empleador es persona natural, debe indicar sus nombres y apellido paterno")
        } else if (vacio(datos.razon_social)) {
            datos.razon_social = [datos.nombres, datos.apellido_paterno, datos.apellido_materno].filter(Boolean).join(" ")
        }
    }
    if (datos.tipo_empleador === "juridica") {
        datos.nombres = null
        datos.apellido_paterno = null
        datos.apellido_materno = null
    }

    if ("razon_social" in datos && vacio(datos.razon_social)) {
        errores.push("Debe indicar la razón social")
    }

    if (datos.codigo_actividad !== undefined && datos.codigo_actividad !== null && !/^\d{6}$/.test(datos.codigo_actividad)) {
        errores.push("El código de actividad económica del SII debe tener 6 dígitos")
    }

    if (datos.comuna !== undefined && datos.comuna !== null && COMUNAS[datos.comuna] === undefined) {
        errores.push("La comuna no está en la tabla de la Dirección del Trabajo")
    }

    for (const [campo, nombre] of [["email", "El correo de la empresa"], ["representante_legal_email", "El correo del representante legal"]]) {
        if (datos[campo] !== undefined && datos[campo] !== null && !EMAIL.test(datos[campo])) {
            errores.push(`${nombre} no es válido`)
        }
    }

    if (datos.telefono && datos.telefono.length > 30) {
        errores.push("El teléfono no puede superar los 30 caracteres")
    }

    // RUT del representante: acepta 12.345.678-9 o 12345678-9 y se guarda con formato.
    if ("representante_legal_rut" in datos) {
        const texto = String(datos.representante_legal_rut ?? "").trim()
        const [cuerpo, dv] = texto.split("-")
        const rut = limpiarRut(cuerpo ?? "")
        if (!dv || !rutEsValido(rut, dv)) {
            errores.push("El RUT del representante legal no es válido (usa el formato 12.345.678-9)")
        } else {
            datos.representante_legal_rut = formatearRut(rut, dv)
        }
    }

    if (datos.ccaf !== undefined && datos.ccaf !== null && CCAF[datos.ccaf] === undefined) {
        errores.push("La caja de compensación indicada no existe")
    }
    if (datos.ccaf === null) {
        datos.ccaf_agencia = null
        datos.ccaf_numero_socio = null
    }

    return { datos, errores }
}

module.exports = {
    CCAF,
    CAMPOS_EMPRESA,
    validarDatosEmpresa
}
