// Sucursales de una empresa. Ver «Casa matriz y sucursales» en el SPEC.
const { Sucursal } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { validarSucursal } = require("./sucursales.js")

function exigirEmpresa(empresaId, empresasPermitidas) {
    const id = Number(empresaId)
    if (!empresasPermitidas.includes(id)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    return id
}

async function obtenerSucursal(empresaId, id, empresasPermitidas) {
    const empresa = exigirEmpresa(empresaId, empresasPermitidas)
    const sucursal = /^\d+$/.test(String(id)) ? await Sucursal.findByPk(id) : null
    if (sucursal === null || sucursal.empresa_id !== empresa) {
        throw new NotFoundError("Sucursal no encontrada")
    }
    return sucursal
}

async function guardar(accion) {
    try {
        return await accion()
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe una sucursal con ese nombre en la empresa")
        }
        throw error
    }
}

// Activas primero y por nombre.
async function listarSucursales(empresaId, empresasPermitidas) {
    const empresa = exigirEmpresa(empresaId, empresasPermitidas)
    return await Sucursal.findAll({ where: { empresa_id: empresa }, order: [["activo", "DESC"], ["nombre", "ASC"]] })
}

async function crearSucursal(empresaId, entrada, empresasPermitidas, usuarioId) {
    const empresa = exigirEmpresa(empresaId, empresasPermitidas)
    await exigirRol(usuarioId, empresa, PERMISOS.EDITAR_EMPRESA)

    const { datos, errores } = validarSucursal(entrada ?? {}, { crear: true })
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }
    return await guardar(() => Sucursal.create({ ...datos, empresa_id: empresa }, { fields: ["empresa_id", "nombre", "direccion", "comuna"] }))
}

// Editar o desactivar (activo: false). Los contratos ya hechos conservan el lugar con que se firmaron.
async function actualizarSucursal(empresaId, id, entrada, empresasPermitidas, usuarioId) {
    const sucursal = await obtenerSucursal(empresaId, id, empresasPermitidas)
    await exigirRol(usuarioId, sucursal.empresa_id, PERMISOS.EDITAR_EMPRESA)

    const { datos, errores } = validarSucursal(entrada ?? {})
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }
    return await guardar(() => sucursal.update(datos, { fields: ["nombre", "direccion", "comuna", "activo"] }))
}

module.exports = { listarSucursales, crearSucursal, actualizarSucursal, obtenerSucursal }
