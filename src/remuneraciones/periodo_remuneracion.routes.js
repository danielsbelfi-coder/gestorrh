const express = require("express")
const { crear, cerrar, reabrir, revisionCierre, listar, obtenerPorId, parametrosFaltantes } = require("./periodo_remuneracion.controller")
const liquidacionRoutes = require('./liquidacion.routes')
const { previred } = require("./previred.controller.js")
const { lre } = require("./lre.controller.js")
const router = express.Router()

router.post("/", crear)
router.get("/:id", obtenerPorId)
router.get("/", listar)
router.get("/:id/revision-cierre", revisionCierre)
router.patch("/:id/cerrar", cerrar)
router.patch("/:id/reabrir", reabrir)
router.use("/:periodoId/liquidaciones", liquidacionRoutes)
router.get("/:id/previred", previred)
router.get("/:id/lre", lre)
router.get("/:id/parametros-faltantes", parametrosFaltantes)
router.get("/:id/nomina-bancaria", async (req, res) => {
    const { nominaLiquidaciones } = require("./nomina_bancaria.service.js")
    res.status(200).json(await nominaLiquidaciones(req.params.id, req.empresasPermitidas, req.usuario.id))
})
// Informe de horas extra y descuentos por atraso (?trabajador_id= para uno solo) y su Excel.
router.get("/:id/informe-horas", async (req, res) => {
    const { informeHoras } = require("./informe_horas.service.js")
    res.status(200).json(await informeHoras(req.params.id, req.query ?? {}, req.empresasPermitidas, req.usuario.id))
})
router.get("/:id/informe-horas.xlsx", async (req, res) => {
    const { excelInformeHoras } = require("./informe_horas.service.js")
    const { archivo, nombre } = await excelInformeHoras(req.params.id, req.query ?? {}, req.empresasPermitidas, req.usuario.id)
    res.attachment(nombre)
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.status(200).send(archivo)
})

module.exports = router