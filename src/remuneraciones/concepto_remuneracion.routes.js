const express = require("express")
const { listar, crear, desactivar, reactivar } = require("./concepto_remuneracion.controler")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.patch("/:id/desactivar", desactivar)
router.patch("/:id/reactivar", reactivar)

module.exports = router