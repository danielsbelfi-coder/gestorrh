const express = require("express")
const { crear, obtenerVigente, listarPorCodigo } = require("./parametro_legal.controller")
const router = express.Router()

router.post("/", crear)
router.get("/:codigo/vigente", obtenerVigente)
router.get("/:codigo/historial", listarPorCodigo)

module.exports = router