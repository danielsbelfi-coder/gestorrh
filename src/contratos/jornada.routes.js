const express = require("express")
const { listar, crear, actualizar, desactivar, reactivar } = require("./jornada.controller.js")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.patch("/:id", actualizar)
router.patch("/:id/desactivar", desactivar)
router.patch("/:id/reactivar", reactivar)

module.exports = router
