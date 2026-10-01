const { crearVersionParametro, obtenerParametroVigente, listarVersionesPorCodigo } = require("./parametro_legal.service");

async function crear(req, res) {
    try {
        const nuevoParametro = await crearVersionParametro(req.body)

        res.status(201).json(nuevoParametro)

    } catch (error) {
        if (error.message === "La nueva vigencia debe ser posterior a la version actual") {
            return res.status(409).json({ error: error.message })
        }
        res.status(400).json({ error: error.message })
    }
}

async function obtenerVigente(req, res) {
    try {
        const parametro = await obtenerParametroVigente(req.params.codigo, req.query.fecha)

        if (parametro === null)
            return res.status(404).json({ error: "No existe un parámetro vigente para ese código en esa fecha" })

        res.status(200).json(parametro)

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

async function listarPorCodigo(req, res) {
    try {
        const listaParametro = await listarVersionesPorCodigo(req.params.codigo)

        res.status(200).json(listaParametro)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

module.exports = {
    crear,
    obtenerVigente,
    listarPorCodigo
}