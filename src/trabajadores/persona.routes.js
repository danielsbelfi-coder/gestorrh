const express = require("express")
const { listar, crear, obtenerPorId, actualizar } = require("./persona.controller")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)

module.exports = router