const express = require("express")
const { listar, crear, desactivar, reactivar, codigoLre } = require("./concepto_remuneracion.controler")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.patch("/:id/desactivar", desactivar)
router.patch("/:id/reactivar", reactivar)
router.patch("/:id/codigo-lre", codigoLre)

module.exports = router