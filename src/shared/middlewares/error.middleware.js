function manejarErrores(err, req, res, next) {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            error: "JSON mal formado en el body de la petición"
        })
    }
    res.status(500).json({
        error: "Error interno del servidor"
    })
}

module.exports = manejarErrores