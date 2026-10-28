const { ValidationError, NotFoundError } = require("../shared/errors");
const { corregirValorParametro, obtenerParametroVigente, listarVersionesPorCodigo,
    parametrosDelMes, abrirMesParametros } = require("./parametro_legal.service");

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

async function delMes(req, res) {
    const resultado = await parametrosDelMes(req.params.mes)
    res.status(200).json(resultado)
}

// Solo soporte. Sin confirmar: true, simula y devuelve lo que copiaría.
async function abrirMes(req, res) {
    const resultado = await abrirMesParametros(req.body?.mes, req.body?.desde, req.body?.confirmar !== true)
    res.status(200).json(resultado)
}

module.exports = {
    corregir,
    obtenerVigente,
    listarPorCodigo,
    delMes,
    abrirMes
}
