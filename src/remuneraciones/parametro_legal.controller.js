const { ValidationError, NotFoundError } = require("../shared/errors");
const { crearVersionParametro, obtenerParametroVigente, listarVersionesPorCodigo } = require("./parametro_legal.service");

async function crear(req, res) {
    const nuevoParametro = await crearVersionParametro(req.body)
    res.status(201).json(nuevoParametro)
}

async function obtenerVigente(req, res) {
    if (!req.query.fecha) {
        throw new ValidationError("Debe indicar la fecha")
    }

    const parametro = await obtenerParametroVigente(req.params.codigo, req.query.fecha)

    if (parametro === null) {
        throw new NotFoundError("No existe un parámetro vigente para ese código en esa fecha")
    }

    res.status(200).json(parametro)
}

async function listarPorCodigo(req, res) {
    const listaParametro = await listarVersionesPorCodigo(req.params.codigo)
    res.status(200).json(listaParametro)
}

module.exports = {
    crear,
    obtenerVigente,
    listarPorCodigo
}