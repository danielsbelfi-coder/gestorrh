const express = require("express")
const { listar, crear, editar, eliminar, saldos } = require("./variable_recurrente.controller.js")

const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.get("/saldos/:trabajadorId", saldos)
router.patch("/:id", editar)
router.delete("/:id", eliminar)

module.exports = router
