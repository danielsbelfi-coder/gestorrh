const express = require("express")
const { listar, crear, obtenerPorId, actualizar, desactivar, restablecerPasword } = require("./usuario.controller")
const router = express.Router()


router.get("/", listar)
router.post("/", crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)
router.patch("/:id/desactivar", desactivar)
router.patch("/:id/restablecer-password", restablecerPasword)

module.exports = router