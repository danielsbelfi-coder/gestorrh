const express = require("express")
const { crear, listar, obtenerPorId, recalcular, emitir, emitirPeriodo, documentoPeriodo, documento } = require("./liquidacion.controller")
const router = express.Router({ mergeParams: true })



router.post("/", crear)
router.get("/", listar)
router.get("/documento", documentoPeriodo)
router.get("/:id", obtenerPorId)
router.get("/:id/documento", documento)
router.post("/:id/recalcular", recalcular)
router.post("/:id/emitir", emitir)
router.post("/emitir", emitirPeriodo)

module.exports = router