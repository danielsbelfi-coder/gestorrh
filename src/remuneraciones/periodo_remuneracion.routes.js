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

module.exports = router