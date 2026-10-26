const { crearLiquidacion, listarLiquidaciones, obtenerLiquidacionPorId, recalcularLiquidacion, emitirLiquidacion, emitirLiquidacionesPeriodo } = require("./liquidacion.service");
const PDFDocument = require("pdfkit")
const { documentoLiquidacion, documentosPeriodo } = require("./documento_liquidacion.service")
const { dibujarLiquidacion, TAMANO_PAGINA } = require("./dibujar_liquidacion")


async function crear(req, res) {
    const resultado = await crearLiquidacion(
        req.params.periodoId,
        req.body?.trabajador_id,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(resultado.reemplazada ? 200 : 201).json(resultado)
}

async function listar(req, res) {
    const listaLiquidacion = await listarLiquidaciones(req.params.periodoId, req.empresasPermitidas)
    res.status(200).json(listaLiquidacion)
}

async function obtenerPorId(req, res) {
    const obtenerIdLiquidacion = await obtenerLiquidacionPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdLiquidacion)
}

async function recalcular(req, res) {
    const resultado = await recalcularLiquidacion(
        req.params.periodoId,
        req.params.id,
        req.body?.motivo,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(201).json(resultado)
}

async function emitir(req, res) {
    const liquidacion = await emitirLiquidacion(
        req.params.periodoId,
        req.params.id,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(200).json(liquidacion)
}

async function emitirPeriodo(req, res) {
    const resultado = await emitirLiquidacionesPeriodo(
        req.params.periodoId,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(resultado.problemas.length > 0 ? 409 : 200).json(resultado)
}

function sufijoPeriodo(periodo) {
    return `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}`
}

function enviarPdf(res, nombreArchivo, documentos, conAportes) {
    const doc = new PDFDocument({ size: TAMANO_PAGINA, margin: 40 })

    res.attachment(nombreArchivo)
    doc.pipe(res)

    documentos.forEach((datos, indice) => {
        if (indice > 0) {
            doc.addPage()
        }
        dibujarLiquidacion(doc, datos, { conAportes })
    })

    doc.end()
}

async function documento(req, res) {
    const { periodo, documentos } = await documentoLiquidacion(req.params.periodoId, req.params.id, req.empresasPermitidas)
    enviarPdf(res, `liquidacion-${req.params.id}-${sufijoPeriodo(periodo)}.pdf`, documentos, req.query.con_aportes === "1")
}

async function documentoPeriodo(req, res) {
    const { periodo, documentos } = await documentosPeriodo(req.params.periodoId, req.empresasPermitidas)
    enviarPdf(res, `liquidaciones-${sufijoPeriodo(periodo)}.pdf`, documentos, req.query.con_aportes === "1")
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    recalcular,
    emitir,
    emitirPeriodo,
    documento,
    documentoPeriodo
}