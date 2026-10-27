const { generarLre } = require("./lre.service.js")

async function lre(req, res) {
    const resultado = await generarLre(req.params.id, req.empresasPermitidas, req.usuario.id)

    if (resultado.problemas) {
        return res.status(409).json({
            error: `No se puede generar el LRE: ${resultado.problemas.length} trabajador(es) con problemas`,
            problemas: resultado.problemas
        })
    }

    const { periodo, empresa, contenido, advertencias } = resultado
    const nombre = `${empresa.rut}-${empresa.dv}_${periodo.anio}${String(periodo.mes).padStart(2, "0")}.csv`

    res.attachment(nombre)
    res.type("text/csv; charset=iso-8859-1")
    res.set("X-Advertencias", encodeURIComponent(JSON.stringify(advertencias)))
    res.send(Buffer.from(contenido, "latin1"))
}

module.exports = {
    lre
}