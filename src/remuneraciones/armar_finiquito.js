const { pesosEnPalabras } = require("../shared/numero_en_palabras.js")
const { formatearRut } = require("../shared/rut.js")
const { fechaEnTexto } = require("../shared/fechas.js")
const { CAUSALES } = require("../shared/causales_termino.js")

function armarFiniquito({ finiquito, empresa, cargo, lugarServicios }) {
    const persona = finiquito.Trabajador.Persona
    const detalle = finiquito.detalle_calculo
    const nombre = [persona.nombres, persona.apellido_paterno, persona.apellido_materno].filter(Boolean).join(" ")
    const rutTrabajador = formatearRut(persona.rut, persona.dv)
    const rutEmpresa = formatearRut(empresa.rut, empresa.dv)

    const haberes = [
        { nombre: "Feriado legal y proporcional", monto: finiquito.monto_feriado },
        { nombre: "Indemnización sustitutiva del aviso previo", monto: finiquito.monto_aviso_previo },
        { nombre: "Indemnización por años de servicio", monto: finiquito.monto_anios_servicio }
    ].filter((fila) => fila.monto > 0)

    const descuentos = [
        { nombre: "Aporte empleador seguro de cesantía", monto: finiquito.imputacion_afc },
        ...finiquito.descuentos.map((d) => ({ nombre: d.glosa, monto: d.monto }))
    ].filter((fila) => fila.monto > 0)

    const totalHaberes = haberes.reduce((suma, fila) => suma + fila.monto, 0)

    return {
        borrador: finiquito.estado === "calculado",
        lugarFecha: `En ${finiquito.lugar} a ${fechaEnTexto(finiquito.fecha_finiquito)}`,
        introduccion: `Entre ${empresa.razon_social}, RUT ${rutEmpresa}, "Empleador", con domicilio en ${empresa.direccion}, y don(ña) ${nombre}, "Trabajador", cédula de identidad N° ${rutTrabajador}, se acuerda el siguiente finiquito:`,
        primero: `PRIMERO: ${nombre} declara haber prestado servicios a ${empresa.razon_social} en calidad de ${cargo}, en ${lugarServicios}, desde el ${fechaEnTexto(detalle.fechaIngreso)} hasta el ${fechaEnTexto(detalle.fechaTermino)}, fecha esta última de terminación de sus servicios por la siguiente causal: ${CAUSALES[detalle.causal]}, del Código del Trabajo.`,
        segundo: `SEGUNDO: ${nombre} declara recibir en este acto, a su entera satisfacción, de parte de ${empresa.razon_social}, las sumas que a continuación se indican, por los siguientes conceptos:`,
        tabla: {
            haberes,
            descuentos,
            totalHaberes,
            totalDescuentos: finiquito.total_descuentos,
            liquido: finiquito.total_a_pagar,
            enPalabras: pesosEnPalabras(finiquito.total_a_pagar)
        },
        clausulas: [
            `TERCERO: ${nombre} deja constancia de que, durante todo el tiempo que prestó servicios a ${empresa.razon_social}, recibió de esta, correcta y oportunamente, el total de las remuneraciones convenidas, asignaciones, feriados legales, horas extraordinarias cuando las trabajó y cotizaciones previsionales, y que nada se le adeuda por concepto de prestaciones laborales legales o contractuales, ni de indemnizaciones de ninguna especie, distintas de las señaladas en este finiquito.`,
            `CUARTO: ${nombre} declara que sus derechos fundamentales fueron plenamente respetados durante la relación laboral y en su término, y que no tiene cargos ni reclamos que formular por enfermedades profesionales o accidentes del trabajo, en conformidad con la Ley N° 16.744 y su normativa complementaria.`,
            `QUINTO: En razón de lo anterior, ${nombre} otorga a ${empresa.razon_social} el más amplio, completo, definitivo y total finiquito, y renuncia expresamente a cualquier acción, derecho o reclamo derivado de la relación laboral o de su término.`,
            `SEXTO: ${empresa.razon_social} reconoce el deber de realizar las retenciones judiciales por pensión de alimentos, de conformidad con la Ley N° 21.389. La ausencia de retención en el detalle de descuentos se debe a que no se ha recibido oficio de un Tribunal de Familia que ordene realizarla.`,
            "Para constancia, las partes firman el presente finiquito en tres ejemplares, quedando dos en poder del Empleador y uno en poder del Trabajador."
        ],
        firmas: {
            trabajador: { nombre, rut: rutTrabajador },
            empleador: { nombre: empresa.razon_social, rut: rutEmpresa }
        },
        totalCuadra: totalHaberes - finiquito.total_descuentos === finiquito.total_a_pagar
    }
}

module.exports = {
    armarFiniquito
}