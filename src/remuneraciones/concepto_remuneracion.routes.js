const express = require("express")
const { listar, crear, desactivar, reactivar, codigoLre, art58, devengoDiario } = require("./concepto_remuneracion.controler")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.patch("/:id/desactivar", desactivar)
router.patch("/:id/reactivar", reactivar)
router.patch("/:id/codigo-lre", codigoLre)
router.patch("/:id/art58", art58)
router.patch("/:id/devengo-diario", devengoDiario)

module.exports = router