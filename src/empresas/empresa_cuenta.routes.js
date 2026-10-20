const express = require("express")
const { listarCuenta } = require("./empresa.controller")
const router = express.Router()

router.get("/", listarCuenta)

module.exports = router