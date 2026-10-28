const express = require("express")
const { listar, crear, actualizar, eliminar } = require("./feriado.controller")
const requiereSoporte = require("../shared/middlewares/requiere-soporte.middleware")
const router = express.Router()

// Los feriados son los mismos para todas las cuentas: cualquiera consulta, solo soporte modifica.
router.get("/", listar)
router.post("/", requiereSoporte, crear)
router.patch("/:id", requiereSoporte, actualizar)
router.delete("/:id", requiereSoporte, eliminar)

module.exports = router
