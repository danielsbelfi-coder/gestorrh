const express = require("express")
const { listar, crear } = require("./usuario_cuenta.controller")
const router = express.Router()

router.get("/", listar)
router.post("/", crear)

module.exports = router