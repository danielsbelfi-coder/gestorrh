const express = require("express")
const { listar, crear, obtenerPorId, actualizar } = require("./persona.controller")
const situacionRoutes = require("./situacion_previsional.routes.js")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)
router.use("/:personaId/situaciones-previsionales", situacionRoutes)

module.exports = router