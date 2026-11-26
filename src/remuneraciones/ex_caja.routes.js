const express = require("express")
const requiereSoporte = require("../shared/middlewares/requiere-soporte.middleware")
const servicio = require("./ex_caja.service.js")
const router = express.Router()

// Paquete AG: ex-cajas de previsión (IPS, ex INP). Las tasas las mantiene soporte, como los parámetros legales.
router.get("/", async (req, res) => res.status(200).json(await servicio.listarExCajas(req.query.fecha)))
router.get("/:id", async (req, res) => res.status(200).json(await servicio.historialTasas(req.params.id)))
router.post("/:id/tasas", requiereSoporte, async (req, res) => res.status(201).json(await servicio.registrarTasa(req.params.id, req.body ?? {})))

module.exports = router
