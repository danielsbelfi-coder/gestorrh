const {
    crearVariable, listarVariables, editarVariable,
    eliminarVariable, aprobarVariable, devolverVariable
} = require("./variable_periodo.service.js")

async function listar(req, res) {
    const variables = await listarVariables(req.query.periodo_id, req.empresasPermitidas)
    res.status(200).json(variables)
}

async function crear(req, res) {
    const variable = await crearVariable(req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(201).json(variable)
}

async function editar(req, res) {
    const variable = await editarVariable(req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(variable)
}

async function eliminar(req, res) {
    await eliminarVariable(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json({ mensaje: "Variable eliminada" })
}

async function aprobar(req, res) {
    const variable = await aprobarVariable(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(variable)
}

async function devolver(req, res) {
    const variable = await devolverVariable(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(variable)
}

module.exports = {
    listar,
    crear,
    editar,
    eliminar,
    aprobar,
    devolver
}