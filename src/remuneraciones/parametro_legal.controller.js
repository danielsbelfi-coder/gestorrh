const { ValidationError, NotFoundError } = require("../shared/errors");
const { corregirValorParametro, obtenerParametroVigente, listarVersionesPorCodigo } = require("./parametro_legal.service");

async function corregir(req, res) {
    const parametro = await corregirValorParametro(req.params.id, req.body)
    res.status(200).json(parametro)
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
    corregir,
    obtenerVigente,
    listarPorCodigo
}