const { listarUsuariosCuenta, crearUsuarioCuenta } = require("./usuario_cuenta.service")


async function listar(req, res) {
    const listaUsuario = await listarUsuariosCuenta(req.usuario)

    res.status(200).json(listaUsuario)
}

async function crear(req, res) {
    const crearUsuario = await crearUsuarioCuenta(req.body ?? {}, req.usuario)

    res.status(201).json(crearUsuario)
}

module.exports = {
    listar,
    crear
}