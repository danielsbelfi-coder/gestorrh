const { NotFoundError, ConflictError } = require("../shared/errors");
const { crearAnexo, firmarAnexo } = require("./contrato_anexo.service");

async function crear(req, res) {
    try {
        const nuevoAnexo = await crearAnexo({
            ...req.body,
            contrato_id: req.params.contratoId
        }, req.empresasPermitidas);

        res.status(201).json(nuevoAnexo)


    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(400).json({
            error: error.message
        })
    }
}

async function firmar(req, res) {
    try {
        const anexoFirmado = await firmarAnexo(req.params.id, req.empresasPermitidas)
        res.status(200).json(anexoFirmado)

    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(500).json({
            error: error.message
        })
    }
}

module.exports = {
    crear,
    firmar
}