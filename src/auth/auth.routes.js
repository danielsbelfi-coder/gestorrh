const express = require("express")
const verificarSesion = require("../shared/middlewares/auth.middleware.js")
const c = require("./auth.controller")
const router = express.Router()

router.post("/login", c.login)
router.post("/logout", verificarSesion, c.logout)
router.patch("/cambiar-password", verificarSesion, c.cambiar)
router.get("/usuario", verificarSesion, c.usuarioEnUso)
router.get("/sesiones", verificarSesion, c.listarMisSesiones)
router.post("/sesiones/cerrar-otras", verificarSesion, c.cerrarMisOtrasSesiones)

// Verificación en dos pasos.
router.post("/2fa/verificar", verificarSesion, c.verificarSegundoPaso)
router.get("/2fa", verificarSesion, c.estadoDosPasos)
router.post("/2fa/inscripcion/iniciar", verificarSesion, c.iniciarInscripcion)
router.post("/2fa/inscripcion/confirmar", verificarSesion, c.confirmarInscripcion)
router.post("/2fa/codigos", verificarSesion, c.regenerarCodigos)
router.post("/2fa/desactivar", verificarSesion, c.desactivarDosPasos)

module.exports = router
