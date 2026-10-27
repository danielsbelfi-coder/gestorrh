const express = require("express")
const { listar, crear, obtenerPorId, aprobacion } = require("./asistencia.controller")
const asistenciaCorreccionRoutes = require("./asistencia_correccion.routes")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id/aprobacion", aprobacion)

router.use("/:asistenciaId/correcciones", asistenciaCorreccionRoutes)

module.exports = router