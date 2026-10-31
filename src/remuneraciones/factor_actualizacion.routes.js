const express = require("express")
const requiereSoporte = require("../shared/middlewares/requiere-soporte.middleware")
const { factoresDelAnio, guardarFactores } = require("./factor_actualizacion.service.js")
const router = express.Router()

// Factores de actualización de la DJ 1887: comunes a todas las cuentas; cualquiera consulta, solo soporte modifica.
router.get("/:anio", async (req, res) => {
    res.status(200).json(await factoresDelAnio(req.params.anio))
})
router.put("/:anio", requiereSoporte, async (req, res) => {
    res.status(200).json(await guardarFactores(req.params.anio, req.body?.factores, req.usuario.id))
})

module.exports = router
