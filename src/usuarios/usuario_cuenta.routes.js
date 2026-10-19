const express = require("express")
const { listar, crear, editar, desactivar, reactivar, cambiarAdmin } = require("./usuario_cuenta.controller")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.patch("/:id", editar)
router.patch("/:id/desactivar", desactivar)
router.patch("/:id/reactivar", reactivar)
router.patch("/:id/admin-cuenta", cambiarAdmin)

module.exports = router