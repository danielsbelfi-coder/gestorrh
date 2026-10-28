const express = require("express")
const { crear, cerrar, listar, obtenerPorId, parametrosFaltantes } = require("./periodo_remuneracion.controller")
const liquidacionRoutes = require('./liquidacion.routes')
const { previred } = require("./previred.controller.js")
const { lre } = require("./lre.controller.js")
const router = express.Router()

router.post("/", crear)
router.get("/:id", obtenerPorId)
router.get("/", listar)
router.patch("/:id/cerrar", cerrar)
router.use("/:periodoId/liquidaciones", liquidacionRoutes)
router.get("/:id/previred", previred)
router.get("/:id/lre", lre)
router.get("/:id/parametros-faltantes", parametrosFaltantes)

module.exports = router