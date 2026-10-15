const { crearEmpresa, listarEmpresas, obtenerEmpresaPorId, actualizarEmpresa, desactivarEmpresa, reactivarEmpresa } = require("./empresa.service.js");



async function crear(req, res) {
    const nuevaEmpresa = await crearEmpresa(req.body, req.usuario);

    res.status(201).json(nuevaEmpresa)
}

async function listar(req, res) {
    const listaEmpresa = await listarEmpresas(req.empresasPermitidas)
    res.status(200).json(listaEmpresa)
}

async function obtenerPorId(req, res) {
    const obtenerIdEmpresa = await obtenerEmpresaPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdEmpresa)
}

async function actualizar(req, res) {
    const empresaActualizada = await actualizarEmpresa(req.params.id, req.body, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(empresaActualizada)
}

async function desactivar(req, res) {
    const empresaInactiva = await desactivarEmpresa(req.params.id, req.usuario, req.body?.confirmar)
    res.status(200).json(empresaInactiva)
}

async function reactivar(req, res) {
    const empresaActiva = await reactivarEmpresa(req.params.id, req.usuario)
    res.status(200).json(empresaActiva)
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar,
    desactivar,
    reactivar
}