const express = require("express")
const { listarCuentas, restablecerPrincipal } = require("./acceso_soporte.controller.js")
const router = express.Router()

router.get("/cuentas", listarCuentas)
router.patch("/cuentas/:id/restablecer-principal", restablecerPrincipal)

module.exports = router
