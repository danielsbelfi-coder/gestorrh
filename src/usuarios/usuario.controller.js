const { crearUsuario, listarUsuarios, obtenerUsuarioPorId, actualizarUsuario, desactivarUsuario } = require("./usuario.service");


async function crear(req, res) {
    const usuarioNuevo = await crearUsuario(req.body)

    res.status(201).json(usuarioNuevo)
}

async function listar(req, res) {
    const listaUsuario = await listarUsuarios()
    res.status(200).json(listaUsuario)
}

async function obtenerPorId(req, res) {
    const obtenerIdUsuario = await obtenerUsuarioPorId(req.params.id)
    res.status(200).json(obtenerIdUsuario)
}


async function actualizar(req, res) {
    const usuarioActualizado = await actualizarUsuario(req.params.id, req.body)
    res.status(200).json(usuarioActualizado)

}

async function desactivar(req, res) {
    const usuarioInactivo = await desactivarUsuario(req.params.id)
    res.status(200).json(usuarioInactivo)
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar,
    desactivar
}