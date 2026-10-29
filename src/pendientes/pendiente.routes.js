const express = require("express")
const { listar } = require("./pendiente.controller.js")
const router = express.Router()

router.get("/", listar)

module.exports = router
