const { Op } = require("sequelize")
const { ConceptoRemuneracion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")

async function listarConceptos(empresaId, empresasPermitidas) {
    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }

    return await ConceptoRemuneracion.findAll({
        where: {
            [Op.or]: [
                { empresa_id: null },
                { empresa_id: empresaId }
            ]
        },
        order: [["tipo", "ASC"], ["nombre", "ASC"]]
    })
}

async function crearConcepto(datos, empresasPermitidas, usuarioId) {
    const empresaId = Number(datos.empresa_id)

    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }

    await exigirRol(usuarioId, empresaId, PERMISOS.CONFIGURAR_CONCEPTOS)

    const codigo = String(datos.codigo ?? "").trim().toUpperCase()

    if (!/^[A-Z0-9_]+$/.test(codigo)) {
        throw new ValidationError("El código solo puede tener letras sin tilde, números y guion bajo")
    }

    if (!datos.nombre || String(datos.nombre).trim() === "") {
        throw new ValidationError("Debe indicar el nombre del concepto")
    }

    if (datos.tipo !== "haber" && datos.tipo !== "descuento") {
        throw new ValidationError("El tipo debe ser haber o descuento")
    }

    const esHaber = datos.tipo === "haber"

    const comun = await ConceptoRemuneracion.findOne({
        where: {
            empresa_id: null,
            codigo
        }
    })

    if (comun !== null) {
        throw new ConflictError("Ese código ya existe como concepto común")
    }

    try {
        const codigoLre = datos.codigo_lre === undefined || datos.codigo_lre === null ? null : Number(datos.codigo_lre)
        const primerDigito = esHaber ? 2 : 3

        if (codigoLre !== null && (!Number.isInteger(codigoLre) || Math.floor(codigoLre / 1000) !== primerDigito)) {
            throw new ValidationError(`El código LRE de un ${datos.tipo} debe ser un código ${primerDigito}xxx del manual de la Dirección del Trabajo`)
        }

        return await ConceptoRemuneracion.create({
            empresa_id: empresaId,
            codigo,
            nombre: String(datos.nombre).trim(),
            tipo: datos.tipo,
            imponible: esHaber && datos.imponible === true,
            tributable: esHaber && datos.tributable === true,
            base_gratificacion: esHaber && datos.base_gratificacion === true,
            recargo_hora_extra: null,
            calculado_por_sistema: false,
            codigo_lre: codigoLre,
            activo: true
        })
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe un concepto con ese código en esta empresa")
        }
        throw error
    }
}

async function obtenerConceptoPropio(id, empresasPermitidas) {
    const concepto = await ConceptoRemuneracion.findByPk(id)

    if (concepto === null) {
        throw new NotFoundError("Concepto no encontrado")
    }

    if (concepto.empresa_id === null) {
        throw new ForbiddenError("Los conceptos comunes los administra la plataforma")
    }

    if (!empresasPermitidas.includes(concepto.empresa_id)) {
        throw new NotFoundError("Concepto no encontrado")
    }

    return concepto
}

async function desactivarConcepto(id, empresasPermitidas, usuarioId) {
    const concepto = await obtenerConceptoPropio(id, empresasPermitidas)

    await exigirRol(usuarioId, concepto.empresa_id, PERMISOS.CONFIGURAR_CONCEPTOS)

    if (concepto.activo === false) {
        throw new ConflictError("El concepto ya está inactivo")
    }

    return await concepto.update({ activo: false })
}

async function reactivarConcepto(id, empresasPermitidas, usuarioId) {
    const concepto = await obtenerConceptoPropio(id, empresasPermitidas)

    await exigirRol(usuarioId, concepto.empresa_id, PERMISOS.CONFIGURAR_CONCEPTOS)

    if (concepto.activo === true) {
        throw new ConflictError("El concepto ya está activo")
    }

    return await concepto.update({ activo: true })
}

module.exports = {
    listarConceptos,
    crearConcepto,
    desactivarConcepto,
    reactivarConcepto,
}