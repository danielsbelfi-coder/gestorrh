const express = require("express")
const verificarSesion = require("../shared/middlewares/auth.middleware.js")
const { login, logout, cambiar, listarMisSesiones, cerrarMisOtrasSesiones, usuarioEnUso } = require("./auth.controller")
const router = express.Router()

router.post("/login", login)
router.post("/logout", verificarSesion, logout)
router.patch("/cambiar-password", verificarSesion, cambiar)
router.get("/usuario", verificarSesion, usuarioEnUso)
router.get("/sesiones", verificarSesion, listarMisSesiones)
router.post("/sesiones/cerrar-otras", verificarSesion, cerrarMisOtrasSesiones)

module.exports = router
