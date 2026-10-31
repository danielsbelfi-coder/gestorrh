const { pesosEnPalabras } = require("../shared/numero_en_palabras.js")
const { formatearRut } = require("../shared/rut.js")
const { fechaEnTexto } = require("../shared/fechas.js")
const { COMUNAS } = require("../shared/comunas_lre.js")
const { textoDistribucion } = require("./jornada_legal.js")

const TITULOS = {
    indefinido: "CONTRATO DE TRABAJO INDEFINIDO",
    plazo_fijo: "CONTRATO DE TRABAJO A PLAZO FIJO",
    obra_faena: "CONTRATO DE TRABAJO POR OBRA O FAENA"
}

const ORDINALES = ["PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO", "SEXTO", "SÉPTIMO", "OCTAVO",
    "NOVENO", "DÉCIMO", "DÉCIMO PRIMERO", "DÉCIMO SEGUNDO", "DÉCIMO TERCERO", "DÉCIMO CUARTO"]

const SISTEMAS = { mensual: "mensual", diario: "diario", semanal: "semanal", hora: "por hora" }
const PERIODICIDADES = { mensual: "mensualmente", quincenal: "quincenalmente", semanal: "semanalmente" }

function miles(monto) {
    return Math.round(Number(monto)).toLocaleString("es-CL")
}

function nombreComuna(codigo) {
    return codigo && COMUNAS[codigo] ? COMUNAS[codigo].nombre : null
}

// Cláusula de duración: lo único que cambia según el tipo de contrato (por ahora).
function textoDuracion(contrato) {
    if (contrato.tipo_contrato === "plazo_fijo") {
        const hasta = contrato.fecha_termino ? `el ${fechaEnTexto(contrato.fecha_termino)}` : "la fecha que las partes acuerden por escrito"
        return `El presente contrato es a plazo fijo y durará hasta ${hasta}, pudiendo cualquiera de las partes ponerle término en las condiciones y por las causales establecidas en la ley.`
    }
    if (contrato.tipo_contrato === "obra_faena") {
        const obra = contrato.obra_faena_descripcion ? `: ${contrato.obra_faena_descripcion}` : " señalada en la cláusula primera"
        return `El presente contrato durará hasta la conclusión del trabajo o servicio que le da origen, esto es, la obra o faena${obra}. Las partes reconocen que la faena termina en forma paulatina según el avance de los trabajos, pudiendo cualquiera de ellas ponerle término en las condiciones y por las causales establecidas en la ley.`
    }
    return "El presente contrato es de duración indefinida, pudiendo cualquiera de las partes ponerle término en las condiciones y por las causales establecidas en la ley."
}

function textoJornada(contrato, jornada) {
    if (contrato.tipo_jornada === "excluido_limitacion") {
        return "El TRABAJADOR queda excluido de la limitación de jornada de trabajo, de conformidad con el inciso segundo del artículo 22 del Código del Trabajo."
    }
    const parcial = contrato.tipo_jornada === "parcial" ? " Se trata de una jornada parcial, regida por los artículos 40 bis y siguientes del Código del Trabajo." : ""
    // Con jornada asignada se imprime la distribución diaria (art. 10 N° 5 del Código del Trabajo).
    if (jornada?.dias) {
        return `La jornada ordinaria de trabajo será de ${Number(contrato.horas_semanales)} horas semanales, distribuidas de la siguiente manera: ${textoDistribucion(jornada.dias)}.${parcial} El tiempo de colación no se considerará trabajado para computar la duración de la jornada, conforme al artículo 34 del Código del Trabajo.`
    }
    return `La jornada ordinaria de trabajo será de ${Number(contrato.horas_semanales)} horas semanales, distribuidas en ${contrato.dias_trabajados} días a la semana.${parcial} La jornada diaria se interrumpirá por el tiempo destinado a colación, que no se considerará trabajado para computar la duración de la jornada, conforme al artículo 34 del Código del Trabajo.`
}

function armarContrato({ contrato, persona, empresa, cargo, trabajador, afp, isapre, situacion, jornada = null }) {
    const nombre = [persona.nombres, persona.apellido_paterno, persona.apellido_materno].filter(Boolean).join(" ")
    const rutTrabajador = formatearRut(persona.rut, persona.dv)
    const rutEmpresa = formatearRut(empresa.rut, empresa.dv)
    const tratamiento = persona.sexo_genero === "femenino" ? "doña" : persona.sexo_genero === "masculino" ? "don" : "don(ña)"
    const comunaEmpresa = nombreComuna(empresa.comuna)
    const comunaPrestacion = nombreComuna(contrato.comuna_prestacion)

    const datosTrabajador = [
        `${tratamiento} ${nombre}`,
        `de nacionalidad ${persona.nacionalidad}`,
        persona.estado_civil ? `estado civil ${persona.estado_civil}` : null,
        persona.fecha_nacimiento ? `nacido(a) el ${fechaEnTexto(persona.fecha_nacimiento)}` : null,
        `cédula de identidad N° ${rutTrabajador}`,
        persona.email ? `correo electrónico ${persona.email}` : null,
        `con domicilio en ${persona.direccion}`
    ].filter(Boolean).join(", ")

    const salud = persona.sistema_salud === "Isapre" ? `Isapre ${isapre?.nombre ?? ""}`.trim() : persona.sistema_salud ?? "No informado"

    const cuerpo = [
        `El TRABAJADOR se compromete a desempeñar las funciones de ${cargo.toUpperCase()}${contrato.funciones ? ` (${contrato.funciones})` : ""} y labores complementarias${contrato.tipo_contrato === "obra_faena" && contrato.obra_faena_descripcion ? `, para la ejecución de la obra o faena: ${contrato.obra_faena_descripcion}` : ""}.`,
        `El TRABAJADOR prestará sus servicios en ${contrato.lugar_prestacion_servicios}${comunaPrestacion ? `, comuna de ${comunaPrestacion}` : ""}. Declara conocer las funciones que desempeñará y poseer salud compatible con ellas, y se obliga a cumplir las normas, procedimientos y políticas de la empresa.`,
        textoJornada(contrato, jornada),
        [
            `El EMPLEADOR pagará al TRABAJADOR las siguientes remuneraciones:`,
            `a) Sueldo base ${SISTEMAS[contrato.sistema_remuneracion] ?? contrato.sistema_remuneracion}: $${miles(contrato.sueldo_base)} (${pesosEnPalabras(Math.round(Number(contrato.sueldo_base)))}).`,
            `b) Gratificación legal conforme al artículo 50 del Código del Trabajo: el 25% de lo devengado por remuneraciones mensuales, con un tope de cuatro coma setenta y cinco (4,75) ingresos mínimos mensuales al año, pagada mensualmente en doceavos.`,
            `La remuneración se pagará ${PERIODICIDADES[contrato.periodicidad_pago] ?? contrato.periodicidad_pago}, por periodo vencido, mediante depósito en cuenta bancaria, transferencia u otro medio seguro de pago. El TRABAJADOR autoriza al EMPLEADOR a efectuar las deducciones legales y a descontar el tiempo no trabajado por atrasos, inasistencias o permisos sin goce de remuneración. Todo beneficio no consignado expresamente en este contrato se entenderá otorgado a título de mera liberalidad y no constituirá derecho adquirido.`
        ].join("\n"),
        [
            "Son obligaciones esenciales del TRABAJADOR, cuyo incumplimiento grave constituye la causal del artículo 160 N° 7 del Código del Trabajo:",
            "• Cumplir las instrucciones de su jefatura y desarrollar su trabajo con el debido cuidado, utilizando los elementos de protección personal entregados por el EMPLEADOR.",
            "• Cuidar los bienes de la empresa, en especial los que se le entreguen para el desempeño de su cargo.",
            "• Cumplir el Reglamento Interno de Orden, Higiene y Seguridad, que forma parte integrante de este contrato.",
            "• Registrar diariamente su asistencia y cumplir puntualmente el horario de trabajo.",
            "• Mantener la confidencialidad de la información, procesos y sistemas de la empresa, y actuar de buena fe."
        ].join("\n"),
        "Se prohíbe al TRABAJADOR presentarse a trabajar o permanecer en el lugar de trabajo bajo la influencia del alcohol o de drogas. Su infracción constituye incumplimiento grave de las obligaciones que impone el contrato.",
        [
            "El TRABAJADOR declara que su afiliación previsional es la siguiente, para que el EMPLEADOR efectúe las cotizaciones correspondientes; cualquier error en esta declaración será de su exclusiva responsabilidad:",
            situacion?.tecnico_extranjero ? "a) AFP: no cotiza (técnico extranjero, Ley N° 18.156)." : `a) AFP: ${afp?.nombre ?? "No informada"}.`,
            `b) Salud: ${salud}.`,
            `c) Seguro de cesantía (Ley N° 19.728): ${persona.afiliado_afc === false ? "No afiliado" : "Afiliado"}.`,
            `d) Calidad de cotizante: ${situacion?.pensionado ? "Pensionado" : "Activo"}.`
        ].join("\n"),
        // Ley 18.156: la exención exige que el contrato exprese la voluntad de mantener la afiliación extranjera.
        situacion?.tecnico_extranjero
            ? "El TRABAJADOR, en su calidad de técnico extranjero, manifiesta expresamente su voluntad de mantener su afiliación al régimen de previsión o seguridad social de su país de origen, que le otorga prestaciones a lo menos en casos de enfermedad, invalidez, vejez y muerte, por lo que, conforme a la Ley N° 18.156, el EMPLEADOR no efectuará cotizaciones al sistema de pensiones chileno. Se mantienen la cotización de salud, el seguro de cesantía y el seguro de la Ley N° 16.744."
            : null,
        textoDuracion(contrato),
        "Este contrato deja sin efecto cualquier otro suscrito anteriormente entre las partes. Sus modificaciones deberán constar en anexos firmados por ambas partes.",
        `Se deja constancia de que el TRABAJADOR ingresó al servicio del EMPLEADOR el ${fechaEnTexto(trabajador.fecha_ingreso)}.`,
        "El TRABAJADOR declara recibir en este acto un ejemplar del Reglamento Interno de Orden, Higiene y Seguridad. Para cualquier controversia, las partes se someten a los tribunales competentes del domicilio del EMPLEADOR.",
        "El presente contrato se firma en dos ejemplares de igual tenor y fecha, quedando uno en poder de cada parte, y el TRABAJADOR declara recibir el suyo a su entera satisfacción."
    ]

    return {
        titulo: (TITULOS[contrato.tipo_contrato] ?? "CONTRATO DE TRABAJO") + (contrato.estado === "anulado" ? " (ANULADO)" : ""),
        lugarFecha: `En ${comunaEmpresa ?? "____________"}, a ${fechaEnTexto(contrato.fecha_inicio)}`,
        empleador: `${empresa.razon_social}, RUT N° ${rutEmpresa}, representada por ${empresa.representante_legal_nombre}, cédula de identidad N° ${empresa.representante_legal_rut}, ambos con domicilio en ${empresa.direccion}${comunaEmpresa ? `, comuna de ${comunaEmpresa}` : ""}, en adelante el "EMPLEADOR".`,
        trabajador: `${datosTrabajador.charAt(0).toUpperCase()}${datosTrabajador.slice(1)}, en adelante el "TRABAJADOR".`,
        clausulas: cuerpo.filter(Boolean).map((texto, i) => ({ ordinal: ORDINALES[i], texto })),
        firmas: {
            trabajador: { nombre, rut: rutTrabajador },
            empleador: { nombre: empresa.razon_social, representante: empresa.representante_legal_nombre, rut: rutEmpresa }
        }
    }
}

module.exports = {
    armarContrato,
    textoDuracion
}
