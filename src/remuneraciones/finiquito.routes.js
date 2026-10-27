const express = require("express")
const { calcular, obtener, emitir, pagar } = require("./finiquito.controller.js")
const router = express.Router()

router.get("/", obtener)
router.post("/", calcular)
router.patch("/:id/emitir", emitir)
router.patch("/:id/pagar", pagar)

module.exports = router