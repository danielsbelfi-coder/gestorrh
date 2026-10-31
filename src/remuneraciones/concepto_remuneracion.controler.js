const { listarConceptos, crearConcepto, desactivarConcepto, reactivarConcepto, asignarCodigoLre, marcarArt58 } = require("./concepto_remuneracion.service.js")

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

async function codigoLre(req, res) {
    const concepto = await asignarCodigoLre(req.params.id, req.body?.codigo_lre, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(concepto)
}

async function art58(req, res) {
    res.status(200).json(await marcarArt58(req.params.id, req.body?.limite_art58, req.empresasPermitidas, req.usuario.id))
}

module.exports = {
    art58,
    listar,
    crear,
    desactivar,
    reactivar,
    codigoLre
}

