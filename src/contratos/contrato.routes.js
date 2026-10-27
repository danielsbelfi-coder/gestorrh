const express = require("express")
const { crear, listar, obtenerPorId, firmar } = require("./contrato.controller")
const contratoAnexoRoutes = require("./contrato_anexo.routes")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id/firmar", firmar)

router.use("/:contratoId/anexos", contratoAnexoRoutes)

module.exports = router