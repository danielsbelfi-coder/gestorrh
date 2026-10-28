const express = require("express")
const { corregir, obtenerVigente, listarPorCodigo, delMes, abrirMes } = require("./parametro_legal.controller")
const requiereSoporte = require("../shared/middlewares/requiere-soporte.middleware")
const router = express.Router()

// Los parámetros legales son los mismos para todas las cuentas: cualquiera consulta, solo soporte modifica.
router.get("/mes/:mes", delMes)
router.post("/abrir-mes", requiereSoporte, abrirMes)
router.patch("/:id", requiereSoporte, corregir)
router.get("/:codigo/vigente", obtenerVigente)
router.get("/:codigo/historial", listarPorCodigo)

module.exports = router
