const express = require("express")
const { listar, crear, obtenerPorId, aprobacion, libro, editar, eliminar, aprobarDelMes } = require("./asistencia.controller")
const asistenciaCorreccionRoutes = require("./asistencia_correccion.routes")
const router = express.Router()

router.get("/", listar)
router.get("/libro", libro)
router.post("/aprobar-mes", aprobarDelMes)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", editar)
router.delete("/:id", eliminar)
router.patch("/:id/aprobacion", aprobacion)

router.use("/:asistenciaId/correcciones", asistenciaCorreccionRoutes)

module.exports = router