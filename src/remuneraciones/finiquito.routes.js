const express = require("express")
const { calcular, obtener, emitir, pagar, documento } = require("./finiquito.controller.js")
const router = express.Router()

router.get("/", obtener)
router.post("/", calcular)
router.patch("/:id/emitir", emitir)
router.patch("/:id/pagar", pagar)
router.get("/:id/documento", documento)

module.exports = router