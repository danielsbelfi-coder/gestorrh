function requiereSoporte(req, res, next) {
    if (req.usuario.es_soporte_plataforma !== true) {
        return res.status(403).json({ error: "No tiene permisos para realizar esta acción" })
    }

    next()
}

module.exports = requiereSoporte