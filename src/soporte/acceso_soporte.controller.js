const servicio = require("./acceso_soporte.service.js")

async function listarAccesos(req, res) {
    res.status(200).json(await servicio.listarAccesosCuenta(req.usuario))
}

async function autorizar(req, res) {
    const acceso = await servicio.autorizarAcceso(req.body ?? {}, req.usuario)
    res.status(201).json({ id: acceso.id, empresa_id: acceso.empresa_id, desde: acceso.desde, hasta: acceso.hasta })
}

async function revocar(req, res) {
    res.status(200).json(await servicio.revocarAcceso(req.params.id, req.usuario))
}

async function registro(req, res) {
    res.status(200).json(await servicio.listarRegistroCuenta(req.usuario))
}

async function listarCuentas(req, res) {
    res.status(200).json(await servicio.listarCuentasSoporte())
}

async function restablecerPrincipal(req, res) {
    const resultado = await servicio.restablecerPrincipal(req.params.id, req.body ?? {}, req.usuario, {
        metodo: req.method,
        ruta: req.originalUrl,
        ip: req.ip
    })
    res.status(200).json(resultado)
}

module.exports = { listarAccesos, autorizar, revocar, registro, listarCuentas, restablecerPrincipal }
