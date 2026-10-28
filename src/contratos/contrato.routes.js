const express = require("express")
const { crear, listar, obtenerPorId, firmar, documento, corregir, anular } = require("./contrato.controller")
const contratoAnexoRoutes = require("./contrato_anexo.routes")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", corregir)
router.patch("/:id/firmar", firmar)
router.patch("/:id/anular", anular)
router.get("/:id/documento", documento)

router.use("/:contratoId/anexos", contratoAnexoRoutes)

module.exports = router