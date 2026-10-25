const express = require("express")
const { listar, guardar, aprobar, devolver, generar } = require("./resumen_asistencia.controller.js")

const router = express.Router()

router.get("/", listar)
router.put("/", guardar)
router.patch("/:id/aprobar", aprobar)
router.patch("/:id/devolver", devolver)
router.post("/generar", generar)

module.exports = router