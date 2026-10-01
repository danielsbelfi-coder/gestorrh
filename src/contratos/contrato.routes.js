const express = require("express")
const { crear, listar, obtenerPorId } = require("./contrato.controller")
const contratoAnexoRoutes = require("./contrato_anexo.routes")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)

router.use("/:contratoId/anexos", contratoAnexoRoutes)

module.exports = router