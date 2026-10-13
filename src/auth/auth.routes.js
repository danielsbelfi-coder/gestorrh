const express = require("express")
const verificarToken = require("../shared/middlewares/auth.middleware.js")
const { login, cambiar } = require("./auth.controller")
const router = express.Router()

router.post("/login", login)
router.patch("/cambiar-password", verificarToken, cambiar)

module.exports = router