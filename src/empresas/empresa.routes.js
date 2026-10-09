const requiereSoporte = require("../shared/middlewares/requiere-soporte.middleware")
const { crear, listar, obtenerPorId, actualizar, desactivar } = require("./empresa.controller")
const express = require("express")
const router = express.Router()


router.get("/", listar)
router.post("/", requiereSoporte, crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)
router.patch("/:id/desactivar", requiereSoporte, desactivar)

module.exports = router