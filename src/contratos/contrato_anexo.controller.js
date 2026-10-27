const { crearAnexo, firmarAnexo, listarAnexos } = require("./contrato_anexo.service");

async function crear(req, res) {
    const nuevoAnexo = await crearAnexo({
        ...req.body,
        contrato_id: req.params.contratoId,
        usuario_creo_id: req.usuario.id
    }, req.empresasPermitidas,
        req.usuario.id
    );

    res.status(201).json(nuevoAnexo)
}

async function firmar(req, res) {
    const anexoFirmado = await firmarAnexo(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(anexoFirmado)
}


async function listar(req, res) {
    const anexos = await listarAnexos(req.params.contratoId, req.empresasPermitidas)
    res.status(200).json(anexos)
}

module.exports = {
    crear,
    firmar,
    listar
}