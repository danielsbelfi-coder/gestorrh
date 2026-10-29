const { listarUsuariosCuenta, crearUsuarioCuenta, editarUsuarioCuenta, desactivarUsuarioCuenta, reactivarUsuarioCuenta, cambiarAdminCuenta, asignarRolEmpresa, quitarRolEmpresa, restablecerAccesoCuenta } = require("./usuario_cuenta.service")


async function listar(req, res) {
    const listaUsuario = await listarUsuariosCuenta(req.usuario)

    res.status(200).json(listaUsuario)
}

async function crear(req, res) {
    const crearUsuario = await crearUsuarioCuenta(req.body ?? {}, req.usuario)

    res.status(201).json(crearUsuario)
}

async function editar(req, res) {
    const editarUsuario = await editarUsuarioCuenta(req.params.id, req.body ?? {}, req.usuario)

    res.status(200).json(editarUsuario)
}

async function desactivar(req, res) {
    const desactivarUsuario = await desactivarUsuarioCuenta(req.params.id, req.usuario)

    res.status(200).json(desactivarUsuario)
}

async function reactivar(req, res) {
    const reactivarUsuario = await reactivarUsuarioCuenta(req.params.id, req.usuario)

    res.status(200).json(reactivarUsuario)
}

async function cambiarAdmin(req, res) {
    const nuevoAdmin = await cambiarAdminCuenta(req.params.id, req.body?.es_admin_cuenta, req.usuario)

    res.status(200).json(nuevoAdmin)
}

async function asignarRol(req, res) {
    const nuevoRol = await asignarRolEmpresa(req.params.id, req.params.empresaId, req.body?.rol, req.usuario)

    res.status(200).json(nuevoRol)
}

async function quitarRol(req, res) {
    const rolQuitado = await quitarRolEmpresa(req.params.id, req.params.empresaId, req.usuario)

    res.status(200).json(rolQuitado)
}

async function restablecerAcceso(req, res) {
    res.status(200).json(await restablecerAccesoCuenta(req.params.id, req.usuario))
}

module.exports = {
    listar,
    crear,
    editar,
    desactivar,
    reactivar,
    cambiarAdmin,
    asignarRol,
    quitarRol,
    restablecerAcceso
}