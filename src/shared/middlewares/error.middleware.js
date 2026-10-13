const { AppError } = require("../errors.js")

function manejarErrores(err, req, res, next) {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            error: "JSON mal formado en el body de la petición"
        })
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message })
    }

    if (err.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ error: "Ya existe un registro con esos datos" })
    }

    if (err.name === "SequelizeValidationError") {
        const campos = err.errors.map((e) => e.path).join(", ")
        return res.status(400).json({ error: `Faltan datos obligatorios o tienen un formato inválido: ${campos}` })
    }
    if (err.name === "SequelizeForeignKeyConstraintError") {
        return res.status(400).json({ error: "Uno de los registros relacionados no existe" })
    }
    if (err.name === "SequelizeDatabaseError" && err.parent?.code?.startsWith("22")) {
        return res.status(400).json({ error: "Alguno de los datos enviados tiene un valor no permitido" })
    }

    console.error(err)
    res.status(500).json({
        error: "Error interno del servidor"
    })
}

module.exports = manejarErrores