const express = require("express")
const { listar, crear, obtenerPorId, actualizar, importar } = require("./persona.controller")
const situacionRoutes = require("./situacion_previsional.routes.js")
const previsionRoutes = require("./prevision_persona.routes.js")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)
router.use("/:personaId/situaciones-previsionales", situacionRoutes)
router.use("/:personaId/previsiones", previsionRoutes)
router.post("/importar", importar)

module.exports = router