const express = require("express")
const { listar, crear, obtenerPorId, actualizar, importar } = require("./persona.controller")
const situacionRoutes = require("./situacion_previsional.routes.js")
const previsionRoutes = require("./prevision_persona.routes.js")
const { tramosRouter, cargasRouter } = require("./carga_familiar.routes.js")
const ahorrosRoutes = require("./ahorro_voluntario.routes.js")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)
router.use("/:personaId/situaciones-previsionales", situacionRoutes)
router.use("/:personaId/previsiones", previsionRoutes)
router.use("/:personaId/tramos-asignacion", tramosRouter)
router.use("/:personaId/cargas", cargasRouter)
router.use("/:personaId/ahorros-voluntarios", ahorrosRoutes)
router.get("/:personaId/saldos-pago-exceso", async (req, res) => {
    const { saldosParaFicha } = require("../remuneraciones/saldo_relaciones.service.js")
    res.status(200).json(await saldosParaFicha(req.params.personaId, req.empresasPermitidas))
})
router.post("/importar", importar)

module.exports = router