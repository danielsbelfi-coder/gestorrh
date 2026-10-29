const express = require("express")
const { listar, crear, editar, desactivar, reactivar, cambiarAdmin, asignarRol, quitarRol, restablecerAcceso } = require("./usuario_cuenta.controller")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.patch("/:id", editar)
router.patch("/:id/desactivar", desactivar)
router.patch("/:id/reactivar", reactivar)
router.patch("/:id/admin-cuenta", cambiarAdmin)
router.put("/:id/empresas/:empresaId/rol", asignarRol)
router.patch("/:id/empresas/:empresaId/quitar", quitarRol)
router.patch("/:id/restablecer-acceso", restablecerAcceso)

module.exports = router