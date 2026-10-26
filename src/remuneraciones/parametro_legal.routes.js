const express = require("express")
const { corregir, obtenerVigente, listarPorCodigo } = require("./parametro_legal.controller")
const requiereSoporte = require("../shared/middlewares/requiere-soporte.middleware")
const router = express.Router()



router.patch("/:id", requiereSoporte, corregir)
router.get("/:codigo/vigente", obtenerVigente)
router.get("/:codigo/historial", listarPorCodigo)

module.exports = router