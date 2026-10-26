const { abrirPeriodo, cerrarPeriodo, listarPeriodos, obtenerPeriodoPorId } = require("./periodo_remuneracion.service");


async function crear(req, res) {
    const nuevoPeriodo = await abrirPeriodo(req.body, req.empresasPermitidas, req.usuario.id)
    res.status(201).json(nuevoPeriodo)
}

async function cerrar(req, res) {
    const resultado = await cerrarPeriodo(req.params.id, req.empresasPermitidas, req.usuario.id)

    if (!resultado.cerrado) {
        return res.status(409).json({
            error: `No se puede cerrar el periodo: ${resultado.problemas.length} trabajador(es) con pendientes`,
            problemas: resultado.problemas
        })
    }

    res.status(200).json(resultado.periodo)
}

async function listar(req, res) {
    const listaPeriodo = await listarPeriodos(req.empresasPermitidas)
    res.status(200).json(listaPeriodo)
}

async function obtenerPorId(req, res) {
    const obtenerIdPeriodo = await obtenerPeriodoPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdPeriodo)
}

module.exports = {
    crear,
    cerrar,
    listar,
    obtenerPorId
}