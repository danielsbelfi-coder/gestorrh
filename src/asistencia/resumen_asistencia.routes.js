const express = require("express")
const { listar, guardar, aprobar, devolver } = require("./resumen_asistencia.controller.js")

const router = express.Router()

router.get("/", listar)
router.put("/", guardar)
router.patch("/:id/aprobar", aprobar)
router.patch("/:id/devolver", devolver)

module.exports = router