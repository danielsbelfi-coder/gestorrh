const { listarConceptos, crearConcepto, desactivarConcepto, reactivarConcepto } = require("./concepto_remuneracion.service.js")

async function listar(req, res) {
    const conceptos = await listarConceptos(Number(req.query.empresa_id), req.empresasPermitidas)
    res.status(200).json(conceptos)
}

async function crear(req, res) {
    const concepto = await crearConcepto(req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(201).json(concepto)
}

async function desactivar(req, res) {
    const concepto = await desactivarConcepto(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(concepto)
}

async function reactivar(req, res) {
    const concepto = await reactivarConcepto(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(concepto)
}

module.exports = {
    listar,
    crear,
    desactivar,
    reactivar
}

