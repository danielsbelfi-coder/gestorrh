const { crearTrabajador, listarTrabajadores, obtenerTrabajadorPorId, actualizarTrabajador, desactivarTrabajador } = require("./trabajador.service");


async function crear(req, res) {
    const nuevoTrabajador = await crearTrabajador(req.body, req.empresasPermitidas, req.usuario.id);
    res.status(201).json(nuevoTrabajador)
}

async function listar(req, res) {
    const listaTRabajador = await listarTrabajadores(req.empresasPermitidas)
    res.status(200).json(listaTRabajador)
}

async function obtenerPorId(req, res) {
    const obtenerIdTrabajador = await obtenerTrabajadorPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdTrabajador)
}

async function actualizar(req, res) {
    const trabajadorActualizado = await actualizarTrabajador(req.params.id, req.body, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(trabajadorActualizado)
}

async function desactivar(req, res) {
    const trabajadorInactivo = await desactivarTrabajador(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(trabajadorInactivo)
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar,
    desactivar
}