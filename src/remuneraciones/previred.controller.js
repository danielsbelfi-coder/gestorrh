const { generarPrevired } = require("./previred.service.js")

async function previred(req, res) {
    const resultado = await generarPrevired(req.params.id, req.empresasPermitidas, req.usuario.id)

    if (resultado.problemas) {
        return res.status(409).json({
            error: `No se puede generar el archivo Previred: ${resultado.problemas.length} trabajador(es) con problemas`,
            problemas: resultado.problemas
        })
    }

    const { periodo, contenido, advertencias } = resultado
    const nombre = `previred_${periodo.anio}_${String(periodo.mes).padStart(2, "0")}.txt`

    res.attachment(nombre)
    res.type("text/plain; charset=iso-8859-1")
    res.set("X-Advertencias", encodeURIComponent(JSON.stringify(advertencias)))
    res.send(Buffer.from(contenido, "latin1"))
}

module.exports = { previred }