const express = require("express")
const { consumoPropio } = require("./consumo.controller.js")
const router = express.Router()

router.get("/", consumoPropio)

module.exports = router
