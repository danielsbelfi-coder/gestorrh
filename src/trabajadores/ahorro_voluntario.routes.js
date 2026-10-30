const express = require("express")
const { listar, registrar, actualizar, eliminar } = require("./ahorro_voluntario.controller.js")

// /api/personas/:personaId/ahorros-voluntarios
const router = express.Router({ mergeParams: true })
router.get("/", listar)
router.post("/", registrar)
router.put("/:id", actualizar)
router.delete("/:id", eliminar)

module.exports = router
