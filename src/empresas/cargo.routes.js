const { crear, listar, obtenerPorId, actualizar, desactivar } = require("./cargo.controller.js")
const express = require("express")
const router = express.Router()


router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)
router.patch("/:id/desactivar", desactivar)

module.exports = router