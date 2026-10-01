const express = require("express")
const { crear, cerrar, listar, obtenerPorId } = require("./periodo_remuneracion.controller")
const liquidacionRoutes = require('./liquidacion.routes')
const router = express.Router()

router.post("/", crear)
router.get("/:id", obtenerPorId)
router.get("/", listar)
router.patch("/:id/cerrar", cerrar)
router.use("/:periodoId/liquidaciones", liquidacionRoutes)

module.exports = router