const express = require("express")
const { crear } = require("./licencia_medica.controller.js")

const router = express.Router()

router.post("/", crear)

module.exports = router