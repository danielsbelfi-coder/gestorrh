const express = require("express")
const { listarCuenta } = require("./empresa.controller")
const { exportarEmpresa } = require("../exportacion/exportacion.controller")
const router = express.Router()

router.get("/", listarCuenta)
router.get("/:id/exportar", exportarEmpresa)

module.exports = router