const express = require("express")
const { listar } = require("./mutualidad.controller.js")
const router = express.Router()

router.get("/", listar)

module.exports = router
