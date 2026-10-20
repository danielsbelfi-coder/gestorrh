const express = require("express")
const verificarToken = require("../shared/middlewares/auth.middleware.js")
const { login, cambiar, usuarioEnUso } = require("./auth.controller")
const router = express.Router()

router.post("/login", login)
router.patch("/cambiar-password", verificarToken, cambiar)
router.get("/usuario", verificarToken, usuarioEnUso)

module.exports = router