const express = require("express")
const { crear, obtenerVigente, listarPorCodigo } = require("./parametro_legal.controller")
const requiereSoporte = require("../shared/middlewares/requiere-soporte.middleware")
const router = express.Router()



router.post("/", requiereSoporte, crear)
router.get("/:codigo/vigente", obtenerVigente)
router.get("/:codigo/historial", listarPorCodigo)

module.exports = router