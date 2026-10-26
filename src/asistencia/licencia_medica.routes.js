const express = require("express")
const { crear, listar, eliminar } = require("./licencia_medica.controller.js")

const router = express.Router()

router.get("/", listar)
router.post("/", crear)
router.delete("/:id", eliminar)

module.exports = router