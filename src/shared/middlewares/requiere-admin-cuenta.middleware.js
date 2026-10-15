function requiereAdminCuenta(req, res, next) {
    if (req.usuario.es_admin_cuenta !== true) {
        return res.status(403).json({ error: "No tiene permisos para realizar esta acción" })
    }

    next()
}

module.exports = requiereAdminCuenta