const { crearCargo, listarCargos, obtenerCargoPorId, actualizarCargo, desactivarCargo } = require("./cargo.service");


async function crear(req, res) {
    const nuevoCargo = await crearCargo(req.body, req.empresasPermitidas, req.usuario.id)
    res.status(201).json(nuevoCargo)
}

async function listar(req, res) {
    const listaCargo = await listarCargos(req.empresasPermitidas)
    res.status(200).json(listaCargo)
}

async function obtenerPorId(req, res) {
    const obtenerIdCargo = await obtenerCargoPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdCargo)
}

async function actualizar(req, res) {
    const cargoActualizado = await actualizarCargo(req.params.id, req.body, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(cargoActualizado)
}

async function desactivar(req, res) {
    const cargoInactivo = await desactivarCargo(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(cargoInactivo)
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar,
    desactivar
}