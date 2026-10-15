function requiereComercial(req, res, next) {
    if (req.usuario.rol_plataforma !== "comercial") {
        return res.status(403).json({ error: "No tiene permisos para realizar esta acción" })
    }

    next()
}

module.exports = requiereComercial