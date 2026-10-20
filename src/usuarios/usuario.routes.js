const express = require("express")
const { listar, obtenerPorId, actualizar, desactivar, restablecerPasword } = require("./usuario.controller")
const router = express.Router()


router.get("/", listar)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)
router.patch("/:id/desactivar", desactivar)
router.patch("/:id/restablecer-password", restablecerPasword)

module.exports = router