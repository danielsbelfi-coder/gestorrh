// Documento del anexo de contrato: deja constancia de la modificación sin tocar el contrato original.
const { pesosEnPalabras } = require("../shared/numero_en_palabras.js")
const { formatearRut } = require("../shared/rut.js")
const { fechaEnTexto } = require("../shared/fechas.js")
const { COMUNAS } = require("../shared/comunas_lre.js")
const { textoDistribucion } = require("./jornada_legal.js")

const TIPOS = { indefinido: "indefinido", plazo_fijo: "a plazo fijo", obra_faena: "por obra o faena" }
const JORNADAS = { completa: "completa", parcial: "parcial", excluido_limitacion: "excluida de la limitación de jornada (art. 22 inciso segundo del Código del Trabajo)" }
const SISTEMAS = { mensual: "mensual", diario: "diario", semanal: "semanal", hora: "por hora" }
const PERIODICIDADES = { mensual: "mensual", quincenal: "quincenal", semanal: "semanal" }

const nombreComuna = (codigo) => (codigo && COMUNAS[codigo] ? COMUNAS[codigo].nombre : codigo)
const miles = (monto) => Math.round(Number(monto)).toLocaleString("es-CL")

// Cláusula de la modificación según el campo.
function textoModificacion(anexo, jornadaNueva) {
    const desde = `a contar del ${fechaEnTexto(anexo.fecha_vigencia)}`
    const nuevo = anexo.valor_nuevo
    switch (anexo.campo_modificado) {
        case "tipo_contrato":
            return `Por el presente instrumento, las partes acuerdan que, ${desde}, el contrato de trabajo individual pasa a ser de duración indefinida, pudiendo cualquiera de ellas ponerle término en las condiciones y por las causales establecidas en la ley. Se mantiene la antigüedad del TRABAJADOR desde su fecha de ingreso.`
        case "fecha_termino":
            return `Las partes acuerdan prorrogar el contrato de trabajo, el que durará hasta el ${fechaEnTexto(nuevo)}, pudiendo cualquiera de ellas ponerle término en las condiciones y por las causales establecidas en la ley.`
        case "sueldo_base":
            return `Las partes acuerdan que, ${desde}, el sueldo base del TRABAJADOR será de $${miles(nuevo)} (${pesosEnPalabras(Math.round(Number(nuevo)))}).`
        case "horas_semanales":
            return `Las partes acuerdan que, ${desde}, la jornada ordinaria de trabajo será de ${Number(nuevo)} horas semanales.`
        case "dias_trabajados":
            return `Las partes acuerdan que, ${desde}, la jornada ordinaria se distribuirá en ${nuevo} días a la semana.`
        case "tipo_jornada":
            return `Las partes acuerdan que, ${desde}, la jornada de trabajo será ${JORNADAS[nuevo] ?? nuevo}.`
        case "jornada_id":
            return jornadaNueva?.dias
                ? `Las partes acuerdan que, ${desde}, la jornada ordinaria se distribuirá de la siguiente manera: ${textoDistribucion(jornadaNueva.dias)}.`
                : `Las partes acuerdan modificar, ${desde}, la distribución de la jornada ordinaria de trabajo.`
        case "funciones":
            return `Las partes acuerdan que, ${desde}, las funciones del TRABAJADOR serán: ${nuevo}.`
        case "lugar_prestacion_servicios":
            return `Las partes acuerdan que, ${desde}, el TRABAJADOR prestará sus servicios en ${nuevo}.`
        case "comuna_prestacion":
            return `Las partes acuerdan que, ${desde}, el TRABAJADOR prestará sus servicios en la comuna de ${nombreComuna(nuevo)}.`
        case "sistema_remuneracion":
            return `Las partes acuerdan que, ${desde}, el sistema de remuneración será ${SISTEMAS[nuevo] ?? nuevo}.`
        case "periodicidad_pago":
            return `Las partes acuerdan que, ${desde}, la remuneración se pagará en forma ${PERIODICIDADES[nuevo] ?? nuevo}.`
        default:
            return `Las partes acuerdan modificar, ${desde}, ${anexo.campo_modificado}: «${anexo.valor_anterior ?? ""}» pasa a «${nuevo}».`
    }
}

function armarAnexo({ anexo, contrato, tipoOriginal, persona, empresa, cargo, jornadaNueva = null }) {
    const nombre = [persona.nombres, persona.apellido_paterno, persona.apellido_materno].filter(Boolean).join(" ")
    const rutTrabajador = formatearRut(persona.rut, persona.dv)
    const rutEmpresa = formatearRut(empresa.rut, empresa.dv)
    const tratamiento = persona.sexo_genero === "femenino" ? "doña" : persona.sexo_genero === "masculino" ? "don" : "don(ña)"
    const comunaEmpresa = nombreComuna(empresa.comuna)
    const fechaSuscripcion = String(anexo.fecha_firma ?? anexo.createdAt ?? anexo.fecha_vigencia).slice(0, 10)

    const clausulas = [
        `Las partes celebraron con fecha ${fechaEnTexto(contrato.fecha_inicio)} un contrato de trabajo ${TIPOS[tipoOriginal] ?? ""}, en virtud del cual el TRABAJADOR se desempeña como ${cargo.toUpperCase()}.`.replace("  ", " "),
        textoModificacion(anexo, jornadaNueva),
        "En todo lo no modificado por el presente anexo, rige íntegramente el contrato de trabajo individual y sus anexos anteriores, los que se entienden formar un solo todo con este instrumento.",
        "El presente anexo se firma en dos ejemplares de igual tenor y fecha, quedando uno en poder de cada parte."
    ]
    const ORDINALES = ["PRIMERO", "SEGUNDO", "TERCERO", "CUARTO"]

    return {
        titulo: "ANEXO DE CONTRATO DE TRABAJO" + (anexo.estado_firma === "rechazado" ? " (SIN EFECTO)" : ""),
        lugarFecha: `En ${comunaEmpresa ?? "____________"}, a ${fechaEnTexto(fechaSuscripcion)}`,
        empleador: `${empresa.razon_social}, RUT N° ${rutEmpresa}, representada por ${empresa.representante_legal_nombre}, cédula de identidad N° ${empresa.representante_legal_rut}, ambos con domicilio en ${empresa.direccion}${comunaEmpresa ? `, comuna de ${comunaEmpresa}` : ""}, en adelante el "EMPLEADOR".`,
        trabajador: `${tratamiento.charAt(0).toUpperCase()}${tratamiento.slice(1)} ${nombre}, cédula de identidad N° ${rutTrabajador}, con domicilio en ${persona.direccion}, en adelante el "TRABAJADOR".`,
        introduccion: "Entre las partes individualizadas se acuerda el siguiente anexo de contrato de trabajo:",
        clausulas: clausulas.map((texto, i) => ({ ordinal: ORDINALES[i], texto })),
        firmas: {
            trabajador: { nombre, rut: rutTrabajador },
            empleador: { nombre: empresa.razon_social, representante: empresa.representante_legal_nombre, rut: rutEmpresa }
        }
    }
}

module.exports = { armarAnexo, textoModificacion }
