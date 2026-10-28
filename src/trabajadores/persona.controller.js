const { crearPersona, listarPersonas, obtenerPersonaPorId, actualizarPersona, importarPersonas } = require("./persona.service");

async function crear(req, res) {
    const nuevaPersona = await crearPersona(req.body, req.empresasPermitidas, req.usuario.id);
    res.status(201).json(nuevaPersona)
}

async function listar(req, res) {
    const listaPersona = await listarPersonas(req.empresasPermitidas)
    res.status(200).json(listaPersona)
}

async function obtenerPorId(req, res) {
    const obtenerIdPersona = await obtenerPersonaPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdPersona)
}

async function actualizar(req, res) {
    const personaActualizada = await actualizarPersona(req.params.id, req.body, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(personaActualizada)
}

async function importar(req, res) {
    const resultado = await importarPersonas(req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(resultado)
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar,
    importar
}